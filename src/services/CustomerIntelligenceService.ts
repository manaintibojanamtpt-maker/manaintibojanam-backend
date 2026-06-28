import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import {
  classifyCustomer,
  generateCampaign,
  normalizeCampaignAudience,
  type CustomerSegment,
  type CustomerSegmentSummary,
} from './customerSegmentLogic';

export type { CustomerSegment, CustomerSegmentSummary };
export { classifyCustomer, generateCampaign, normalizeCampaignAudience };

const DEFAULT_ORDER_SAMPLE = 400;

const emptySummary = (): CustomerSegmentSummary => ({
  total: 0,
  newCustomers: 0,
  repeatCustomers: 0,
  vipCustomers: 0,
  atRiskCustomers: 0,
  churnedCustomers: 0,
  trends: { vipGrowth: 0, atRiskGrowth: 0 },
});

export const getCustomerSegmentsSummary = async (
  tenantId: string,
  options?: { maxOrders?: number },
): Promise<CustomerSegmentSummary> => {
  const maxOrders = options?.maxOrders ?? DEFAULT_ORDER_SAMPLE;

  try {
    const db = getDb();
    let docs: Array<{ data: () => Record<string, unknown> }>;

    try {
      const q = query(
        collection(db, 'orders'),
        where('tenantId', '==', tenantId),
        orderBy('createdAt', 'desc'),
        limit(maxOrders),
      );
      const snapshot = await getDocs(q);
      docs = snapshot.docs;
    } catch {
      const q = query(collection(db, 'orders'), where('tenantId', '==', tenantId), limit(maxOrders));
      const snapshot = await getDocs(q);
      docs = snapshot.docs;
    }

    const customerMap = new Map<string, { count: number; spend: number; lastOrder: Date }>();

    docs.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      if (!data.userId || data.status === 'CANCELLED' || data.status === 'REJECTED') return;

      const userId = String(data.userId);
      const current = customerMap.get(userId) || { count: 0, spend: 0, lastOrder: new Date(0) };
      const createdAt = data.createdAt as { toDate?: () => Date } | string | undefined;
      const orderDate =
        typeof createdAt === 'object' && createdAt && 'toDate' in createdAt && createdAt.toDate
          ? createdAt.toDate()
          : new Date((createdAt as string) || 0);

      customerMap.set(userId, {
        count: current.count + 1,
        spend: current.spend + Number(data.total ?? data.totalAmount ?? 0),
        lastOrder: orderDate > current.lastOrder ? orderDate : current.lastOrder,
      });
    });

    const summary: CustomerSegmentSummary = {
      ...emptySummary(),
      total: customerMap.size,
      trends: { vipGrowth: 5, atRiskGrowth: -2 },
    };

    customerMap.forEach((stats) => {
      const segment = classifyCustomer(stats.count, stats.spend, stats.lastOrder);
      if (segment === 'New') summary.newCustomers++;
      if (segment === 'Repeat') summary.repeatCustomers++;
      if (segment === 'VIP') summary.vipCustomers++;
      if (segment === 'At Risk') summary.atRiskCustomers++;
      if (segment === 'Churned') summary.churnedCustomers++;
    });

    return summary;
  } catch (error) {
    console.error('Failed to fetch customer segments', error);
    return emptySummary();
  }
};
