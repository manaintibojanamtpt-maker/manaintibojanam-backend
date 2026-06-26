import { collection, query, where, getDocs } from 'firebase/firestore';
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
  inactive?: number;
  vip?: number;
  trends: {
    vipGrowth: number;
    atRiskGrowth: number;
  };
}

const VIP_SPEND_THRESHOLD = 5000;

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

    const customerMap = new Map<string, { count: number; spend: number; lastOrder: Date }>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.userId || data.status === 'CANCELLED' || data.status === 'REJECTED') return;

      const current = customerMap.get(data.userId) || { count: 0, spend: 0, lastOrder: new Date(0) };
      const orderDate = data.createdAt?.toDate?.() || new Date(data.createdAt || 0);

      customerMap.set(data.userId, {
        count: current.count + 1,
        spend: current.spend + (data.total || data.totalAmount || 0),
        lastOrder: orderDate > current.lastOrder ? orderDate : current.lastOrder,
      });
    });

    const summary: CustomerSegmentSummary = {
      total: customerMap.size,
      newCustomers: 0,
      repeatCustomers: 0,
      vipCustomers: 0,
      atRiskCustomers: 0,
      churnedCustomers: 0,
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
    return {
      total: 0,
      newCustomers: 0,
      repeatCustomers: 0,
      vipCustomers: 0,
      atRiskCustomers: 0,
      churnedCustomers: 0,
      trends: { vipGrowth: 0, atRiskGrowth: 0 },
    };
  }
};

type CampaignKey =
  | 'recovery_inactive'
  | 'win_back_lost'
  | 'loyalty_repeat'
  | 'vip_high_value'
  | 'birthday'
  | 'festival'
  | 'referral';

export const normalizeCampaignAudience = (audience: string): CampaignKey => {
  if (audience.includes('Inactive')) return 'recovery_inactive';
  if (audience.includes('Lost')) return 'win_back_lost';
  if (audience.includes('Repeat')) return 'loyalty_repeat';
  if (audience.includes('Birthday')) return 'birthday';
  if (audience.includes('Festival')) return 'festival';
  if (audience.includes('Referral')) return 'referral';
  if (audience.includes('VIP')) return 'vip_high_value';
  return 'vip_high_value';
};

export const generateCampaign = (
  audience: string,
  tenantName: string,
  storeLink = '[STORE_LINK]',
  segments?: CustomerSegmentSummary | null
) => {
  const key = normalizeCampaignAudience(audience);
  const link = storeLink;

  const templates: Record<CampaignKey, {
    couponCode: string;
    whatsappCopy: string;
    smsCopy: string;
    instagramCaption: string;
    reachBase: number;
    ordersBase: number;
    revenueBase: number;
    confidenceScore: number;
  }> = {
    recovery_inactive: {
      couponCode: 'MISSYOU10',
      whatsappCopy: `Hi! We noticed you haven't ordered from ${tenantName} recently. We miss serving you!\n\nUse code *MISSYOU10* for 10% OFF your next order.\n\nOrder here: ${link}`,
      smsCopy: `${tenantName}: We miss you! Enjoy 10% OFF with code MISSYOU10. Order: ${link}`,
      instagramCaption: `Missing our regulars at ${tenantName}! Use code MISSYOU10 for 10% OFF today. Link in bio.`,
      reachBase: 120,
      ordersBase: 18,
      revenueBase: 6200,
      confidenceScore: 88,
    },
    win_back_lost: {
      couponCode: 'COMEBACK15',
      whatsappCopy: `It's been a while since your last meal from ${tenantName}. Come back with 15% OFF!\n\nUse code *COMEBACK15* at checkout.\n\nOrder here: ${link}`,
      smsCopy: `${tenantName}: Come back with 15% OFF using COMEBACK15. Order: ${link}`,
      instagramCaption: `Been a while? ${tenantName} wants you back. 15% OFF with COMEBACK15. Link in bio.`,
      reachBase: 80,
      ordersBase: 12,
      revenueBase: 4200,
      confidenceScore: 76,
    },
    loyalty_repeat: {
      couponCode: 'LOYALTY12',
      whatsappCopy: `Thank you for being a loyal ${tenantName} customer! Enjoy 12% OFF your next order as our appreciation.\n\nUse code *LOYALTY12*.\n\nOrder here: ${link}`,
      smsCopy: `${tenantName}: Loyalty reward — 12% OFF with LOYALTY12. Order: ${link}`,
      instagramCaption: `To our regulars at ${tenantName} — thank you! Use LOYALTY12 for 12% OFF. Link in bio.`,
      reachBase: 95,
      ordersBase: 28,
      revenueBase: 9800,
      confidenceScore: 90,
    },
    vip_high_value: {
      couponCode: 'VIPREWARD',
      whatsappCopy: `Hi! You are one of ${tenantName}'s top customers. Enjoy a special reward: ₹100 OFF or a free dessert on us!\n\nUse code *VIPREWARD*.\n\nOrder here: ${link}`,
      smsCopy: `${tenantName} VIP reward: ₹100 OFF with VIPREWARD. Order: ${link}`,
      instagramCaption: `We love our VIPs at ${tenantName}! Use VIPREWARD for an exclusive treat. Link in bio.`,
      reachBase: 40,
      ordersBase: 22,
      revenueBase: 11000,
      confidenceScore: 94,
    },
    birthday: {
      couponCode: 'BDAYTREAT',
      whatsappCopy: `Happy birthday from ${tenantName}! Celebrate with a complimentary dessert or 15% OFF your order.\n\nUse code *BDAYTREAT*.\n\nOrder here: ${link}`,
      smsCopy: `${tenantName}: Happy birthday! Use BDAYTREAT for a special treat. Order: ${link}`,
      instagramCaption: `Birthday month specials at ${tenantName}! Tag a friend and use BDAYTREAT. Link in bio.`,
      reachBase: 35,
      ordersBase: 14,
      revenueBase: 5100,
      confidenceScore: 82,
    },
    festival: {
      couponCode: 'FESTIVAL20',
      whatsappCopy: `Celebrate the season with ${tenantName}! Enjoy 20% OFF our festive menu for 48 hours.\n\nUse code *FESTIVAL20*.\n\nOrder here: ${link}`,
      smsCopy: `${tenantName} Festive Special: 20% OFF with FESTIVAL20. Valid 48hrs! ${link}`,
      instagramCaption: `Festive specials at ${tenantName}! Use FESTIVAL20 for 20% OFF. Link in bio.`,
      reachBase: 200,
      ordersBase: 45,
      revenueBase: 18000,
      confidenceScore: 91,
    },
    referral: {
      couponCode: 'SHARE50',
      whatsappCopy: `Love ${tenantName}? Share the love! Send this to a friend — you both get ₹50 OFF.\n\nShare code: *SHARE50*\n\nOrder here: ${link}`,
      smsCopy: `${tenantName}: Share SHARE50 with a friend. You both get ₹50 OFF! ${link}`,
      instagramCaption: `Share ${tenantName} with a friend! Code SHARE50 gives you both ₹50 OFF. Link in bio.`,
      reachBase: 150,
      ordersBase: 30,
      revenueBase: 12000,
      confidenceScore: 72,
    },
  };

  const template = templates[key];
  const reachMultiplier = segments?.total ? Math.max(0.5, Math.min(segments.total / 100, 2)) : 1;

  const segmentReach = (() => {
    if (!segments) return template.reachBase;
    switch (key) {
      case 'recovery_inactive': return Math.max(segments.atRiskCustomers + segments.churnedCustomers, 1);
      case 'win_back_lost': return Math.max(segments.churnedCustomers, 1);
      case 'loyalty_repeat': return Math.max(segments.repeatCustomers, 1);
      case 'vip_high_value': return Math.max(segments.vipCustomers, 1);
      default: return Math.max(segments.total, 1);
    }
  })();

  const expectedReach = Math.max(Math.round(segmentReach * reachMultiplier), 5);
  const expectedOrders = Math.max(Math.round(template.ordersBase * reachMultiplier), 2);
  const expectedRevenueLift = Math.round(template.revenueBase * reachMultiplier);

  return {
    whatsappCopy: template.whatsappCopy,
    smsCopy: template.smsCopy,
    instagramCaption: template.instagramCaption,
    couponCode: template.couponCode,
    expectedReach,
    expectedOrders,
    expectedRevenueLift,
    confidenceScore: template.confidenceScore,
  };
};
