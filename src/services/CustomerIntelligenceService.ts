import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { differenceInDays } from 'date-fns';

export type CustomerSegment = 'New' | 'Repeat' | 'VIP' | 'At Risk' | 'Churned';

export interface CustomerSegmentSummary {
  total: number;
  newCustomers: number;
  repeatCustomers: number;
  vipCustomers: number;
  atRiskCustomers: number;
  churnedCustomers: number;
  trends: {
    vipGrowth: number;
    atRiskGrowth: number;
  };
}

const VIP_SPEND_THRESHOLD = 5000; // Configurable per tenant ideally

export const classifyCustomer = (
  ordersCount: number,
  lifetimeSpend: number,
  lastOrderDate: Date
): CustomerSegment => {
  const daysSinceLastOrder = differenceInDays(new Date(), lastOrderDate);

  if (daysSinceLastOrder > 30) return 'Churned';
  if (daysSinceLastOrder > 14) return 'At Risk';
  if (lifetimeSpend >= VIP_SPEND_THRESHOLD) return 'VIP';
  if (ordersCount >= 2) return 'Repeat';
  return 'New';
};

export const getCustomerSegmentsSummary = async (tenantId: string): Promise<CustomerSegmentSummary> => {
  try {
    const db = getDb();
    const q = query(collection(db, 'orders'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);

    // Group orders by userId
    const customerMap = new Map<string, { count: number; spend: number; lastOrder: Date }>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.userId || data.status === 'CANCELLED' || data.status === 'REJECTED') return;

      const current = customerMap.get(data.userId) || { count: 0, spend: 0, lastOrder: new Date(0) };
      const orderDate = data.createdAt?.toDate() || new Date();

      customerMap.set(data.userId, {
        count: current.count + 1,
        spend: current.spend + (data.total || 0),
        lastOrder: orderDate > current.lastOrder ? orderDate : current.lastOrder
      });
    });

    const summary: CustomerSegmentSummary = {
      total: customerMap.size,
      newCustomers: 0,
      repeatCustomers: 0,
      vipCustomers: 0,
      atRiskCustomers: 0,
      churnedCustomers: 0,
      trends: { vipGrowth: 5, atRiskGrowth: -2 } // Mock trend data until historical tracking is built
    };

    customerMap.forEach(stats => {
      const segment = classifyCustomer(stats.count, stats.spend, stats.lastOrder);
      if (segment === 'New') summary.newCustomers++;
      if (segment === 'Repeat') summary.repeatCustomers++;
      if (segment === 'VIP') summary.vipCustomers++;
      if (segment === 'At Risk') summary.atRiskCustomers++;
      if (segment === 'Churned') summary.churnedCustomers++;
    });

    return summary;
  } catch (error) {
    console.error("Failed to fetch customer segments", error);
    return {
      total: 0, newCustomers: 0, repeatCustomers: 0, vipCustomers: 0, atRiskCustomers: 0, churnedCustomers: 0,
      trends: { vipGrowth: 0, atRiskGrowth: 0 }
    };
  }
};

export const generateCampaign = (audience: string, tenantName: string) => {
  let whatsappCopy = "";
  let smsCopy = "";
  let couponCode = "";
  let expectedRecoveryPerUser = 0;

  switch (audience) {
    case 'At Risk':
      couponCode = "MISSYOU10";
      whatsappCopy = `Hi! We noticed you haven't ordered from ${tenantName} recently. We miss serving you! 🥺\n\nUse code *${couponCode}* for 10% OFF your next order.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName}: We miss you! Enjoy 10% OFF your next meal with code ${couponCode}. Order now: [STORE_LINK]`;
      expectedRecoveryPerUser = 250;
      break;
    case 'Churned':
      couponCode = "COMEBACK15";
      whatsappCopy = `It's been a while since your last meal from ${tenantName}. Come back and enjoy a special 15% OFF on us! 🍲✨\n\nUse code *${couponCode}* at checkout.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName}: Come back & enjoy 15% OFF your next order with code ${couponCode}. Order: [STORE_LINK]`;
      expectedRecoveryPerUser = 350;
      break;
    case 'VIP':
      couponCode = "VIPREWARD";
      whatsappCopy = `Hi! You are one of ${tenantName}'s top customers. As a thank you for your loyalty, enjoy a FREE dessert or ₹100 OFF your next order! 🏆🎁\n\nUse code *${couponCode}*.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName} VIP Reward: Get a free dessert or ₹100 OFF with code ${couponCode}. Thanks for your loyalty! [STORE_LINK]`;
      expectedRecoveryPerUser = 500;
      break;
    default:
      couponCode = "WELCOME5";
      whatsappCopy = `Enjoy your meals from ${tenantName}! Use code *${couponCode}* for 5% OFF.`;
      smsCopy = `Enjoy 5% OFF at ${tenantName} with code ${couponCode}.`;
      expectedRecoveryPerUser = 150;
  }

  return { whatsappCopy, smsCopy, couponCode, expectedRecoveryPerUser };
};
