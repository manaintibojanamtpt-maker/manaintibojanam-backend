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
  let instagramCaption = "";
  let couponCode = "";
  let expectedReach = 0;
  let expectedOrders = 0;
  let expectedRevenueLift = 0;
  let confidenceScore = 0;

  switch (audience) {
    case 'Customer Recovery':
      couponCode = "MISSYOU10";
      whatsappCopy = `Hi! We noticed you haven't ordered from ${tenantName} recently. We miss serving you! 🥺\n\nUse code *${couponCode}* for 10% OFF your next order.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName}: We miss you! Enjoy 10% OFF your next meal with code ${couponCode}. Order now: [STORE_LINK]`;
      instagramCaption = `We miss our favorite customers! 🥺 Tag someone who owes you a meal from ${tenantName} and use code ${couponCode} for 10% OFF today! Link in bio. 🥘✨`;
      expectedReach = 450;
      expectedOrders = 25;
      expectedRevenueLift = 8500;
      confidenceScore = 88;
      break;
    case 'Win-Back':
      couponCode = "COMEBACK15";
      whatsappCopy = `It's been a while since your last meal from ${tenantName}. Come back and enjoy a special 15% OFF on us! 🍲✨\n\nUse code *${couponCode}* at checkout.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName}: Come back & enjoy 15% OFF your next order with code ${couponCode}. Order: [STORE_LINK]`;
      instagramCaption = `Been a while? Let's fix that! 🍲 Get 15% OFF your entire order with code ${couponCode} today. Link in bio to order!`;
      expectedReach = 200;
      expectedOrders = 10;
      expectedRevenueLift = 3500;
      confidenceScore = 75;
      break;
    case 'Festival Promotion':
      couponCode = "FESTIVAL20";
      whatsappCopy = `Celebrate the season with ${tenantName}! 🎊 Enjoy 20% OFF our special festive menu. Valid for 48 hours only!\n\nUse code *${couponCode}*.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName} Festive Special: Get 20% OFF with code ${couponCode}. Valid 48hrs! [STORE_LINK]`;
      instagramCaption = `It's time to celebrate! 🎉 Enjoy our festive specials at ${tenantName}. Use code ${couponCode} for 20% OFF your entire order. Link in bio! 🍛✨`;
      expectedReach = 1500;
      expectedOrders = 120;
      expectedRevenueLift = 45000;
      confidenceScore = 92;
      break;
    case 'Combo Offers':
      couponCode = "COMBOFREE";
      whatsappCopy = `Craving a feast? 🥘 Buy any Family Combo from ${tenantName} and get a FREE dessert on us!\n\nUse code *${couponCode}*.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName}: Buy any Combo, get a FREE dessert with code ${couponCode}. Order: [STORE_LINK]`;
      instagramCaption = `The ultimate feast awaits! 🥘 Buy any Family Combo and get a FREE dessert on us. Because there's always room for sweet! Use code ${couponCode}. Link in bio.`;
      expectedReach = 800;
      expectedOrders = 45;
      expectedRevenueLift = 22000;
      confidenceScore = 85;
      break;
    case 'Referral':
      couponCode = "SHARE50";
      whatsappCopy = `Love ${tenantName}? Share the love! ❤️ Send this link to a friend and you both get ₹50 OFF your next order!\n\nShare this code: *${couponCode}*\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName}: Share code ${couponCode} with a friend. You both get ₹50 OFF! Order: [STORE_LINK]`;
      instagramCaption = `Good food is meant to be shared! ❤️ Tag your foodie partner in crime. If they order using code ${couponCode}, you both get ₹50 OFF! Link in bio.`;
      expectedReach = 2000;
      expectedOrders = 80;
      expectedRevenueLift = 30000;
      confidenceScore = 70;
      break;
    default: // VIP
      couponCode = "VIPREWARD";
      whatsappCopy = `Hi! You are one of ${tenantName}'s top customers. As a thank you for your loyalty, enjoy a FREE dessert or ₹100 OFF your next order! 🏆🎁\n\nUse code *${couponCode}*.\n\nOrder here: [STORE_LINK]`;
      smsCopy = `${tenantName} VIP Reward: Get a free dessert or ₹100 OFF with code ${couponCode}. Thanks for your loyalty! [STORE_LINK]`;
      instagramCaption = `We love our regulars! ❤️ Show this post at ${tenantName} for a free upgrade on your meal today. Thanks for being awesome!`;
      expectedReach = 150;
      expectedOrders = 50;
      expectedRevenueLift = 12000;
      confidenceScore = 95;
  }

  return { whatsappCopy, smsCopy, instagramCaption, couponCode, expectedReach, expectedOrders, expectedRevenueLift, confidenceScore };
};
