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

const DEFAULT_ORDER_SAMPLE = 80;

const emptySummary = (): CustomerSegmentSummary => ({
  total: 0,
  newCustomers: 0,
  repeatCustomers: 0,
  vipCustomers: 0,
  atRiskCustomers: 0,
  churnedCustomers: 0,
  trends: { vipGrowth: 0, atRiskGrowth: 0 },
});

type SegmentOrderLike = {
  userId?: string | null;
  status?: string | null;
  total?: number | null;
  totalAmount?: number | null;
  createdAt?: { toDate?: () => Date } | string | Date | null;
};

function resolveOrderDate(createdAt: SegmentOrderLike['createdAt']): Date {
  if (!createdAt) return new Date(0);
  if (createdAt instanceof Date) return createdAt;
  if (typeof createdAt === 'object' && typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }
  return new Date(createdAt as string);
}

/** Build segment summary from already-loaded orders (no extra Firestore round trip). */
export function summarizeCustomerSegmentsFromOrders(
  orders: SegmentOrderLike[],
): CustomerSegmentSummary {
  const customerMap = new Map<string, { count: number; spend: number; lastOrder: Date }>();

  for (const order of orders) {
    if (!order.userId || order.status === 'CANCELLED' || order.status === 'REJECTED') continue;
    const userId = String(order.userId);
    const current = customerMap.get(userId) || { count: 0, spend: 0, lastOrder: new Date(0) };
    const orderDate = resolveOrderDate(order.createdAt);
    customerMap.set(userId, {
      count: current.count + 1,
      spend: current.spend + Number(order.total ?? order.totalAmount ?? 0),
      lastOrder: orderDate > current.lastOrder ? orderDate : current.lastOrder,
    });
  }

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
}

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

    return summarizeCustomerSegmentsFromOrders(
      docs.map((docSnap) => docSnap.data() as SegmentOrderLike),
    );
  } catch (error) {
    console.error('Failed to fetch customer segments', error);
    return emptySummary();
  }
};
