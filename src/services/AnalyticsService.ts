import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { Order } from '../types';

export type AnalyticsEvent = 
  | 'upsellViewed' 
  | 'upsellClicked' 
  | 'upsellAddedToCart' 
  | 'upsellPurchased'
  | 'reorderViewed'
  | 'reorderClicked'
  | 'reorderPurchased'
  // Phase 6C CRM Events
  | 'segmentAssigned'
  | 'loyaltyPointsEarned'
  | 'loyaltyPointsRedeemed'
  | 'customerReactivated'
  | 'customerChurned'
  // Phase 6C Campaign Events
  | 'campaignCreated'
  | 'campaignSent'
  | 'campaignOpened'
  | 'campaignClicked'
  | 'campaignConverted'
  // Phase 6C Inventory Events
  | 'stockReserved'
  | 'stockReleased'
  | 'stockReduced'
  | 'stockAlert'
  | 'autoLocked'
  | 'itemRestocked';

export interface TenantAnalytics {
  id?: string;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerCount: number;
  repeatCustomers: number;
  customerRetentionRate?: number;
  currentMonth?: {
    revenue: number;
    orders: number;
  };
  previousMonth?: {
    revenue: number;
    orders: number;
  };
  lastUpdated: any;
}

export const getTenantAnalytics = async (tenantId: string): Promise<TenantAnalytics | null> => {
  const db = getDb();
  const docRef = doc(db, 'tenants', tenantId, 'analytics', 'overview');
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data() as TenantAnalytics;
  }
  return null;
};

// Use this for testing/backfilling. In production, this should be a Cloud Function.
export const backfillAnalytics = async (tenantId: string) => {
  const db = getDb();
  const ordersRef = collection(db, 'orders');
  const q = query(ordersRef, where('tenantId', '==', tenantId));
  const snapshot = await getDocs(q);
  
  let totalRevenue = 0;
  let totalOrders = 0;
  const customers = new Set<string>();
  const repeatSet = new Set<string>();
  
  snapshot.docs.forEach(docSnap => {
    const order = docSnap.data() as Order;
    // Only count successful/delivered orders in revenue (or all valid orders)
    if (order.status !== 'CANCELLED' && order.status !== 'EXPIRED' && order.status !== 'FAILED_DELIVERY') {
      totalRevenue += (order.totalAmount || 0);
      totalOrders++;
      
      const customerKey = order.userId || order.phone;
      if (customerKey) {
        if (customers.has(customerKey)) {
          repeatSet.add(customerKey);
        } else {
          customers.add(customerKey);
        }
      }
    }
  });

  const analyticsRef = doc(db, 'tenants', tenantId, 'analytics', 'overview');
  await setDoc(analyticsRef, {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    customerCount: customers.size,
    repeatCustomers: repeatSet.size,
    lastUpdated: new Date()
  });
  
  return {
    totalRevenue,
    totalOrders,
    customerCount: customers.size,
    repeatCustomers: repeatSet.size
  };
};

export const recordOrderCompletion = async (tenantId: string, order: Order) => {
  const db = getDb();
  const analyticsRef = doc(db, 'tenants', tenantId, 'analytics', 'overview');
  
  try {
    const amount = order.totalAmount || 0;
    await updateDoc(analyticsRef, {
      totalRevenue: increment(amount),
      totalOrders: increment(1),
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error("Error updating analytics:", error);
    await backfillAnalytics(tenantId);
  }
};

export const trackEvent = async (tenantId: string, eventName: AnalyticsEvent, payload?: any) => {
  try {
    const db = getDb();
    const eventRef = collection(db, 'tenants', tenantId, 'events');
    await setDoc(doc(eventRef), {
      event: eventName,
      payload: payload || null,
      timestamp: new Date()
    });
    
    // Also increment specific metrics in overview if needed
    const analyticsRef = doc(db, 'tenants', tenantId, 'analytics', 'overview');
    const updateObj: Record<string, any> = {};
    if (eventName === 'upsellViewed') updateObj.upsellViews = increment(1);
    if (eventName === 'upsellClicked') updateObj.upsellClicks = increment(1);
    if (eventName === 'upsellAddedToCart') updateObj.upsellAdds = increment(1);
    if (eventName === 'upsellPurchased') {
      updateObj.upsellPurchases = increment(1);
      if (payload?.amount) updateObj.upsellRevenue = increment(payload.amount);
    }
    if (eventName === 'reorderViewed') updateObj.reorderViews = increment(1);
    if (eventName === 'reorderPurchased') {
      updateObj.reorderPurchases = increment(1);
      if (payload?.amount) updateObj.reorderRevenue = increment(payload.amount);
    }
    
    if (Object.keys(updateObj).length > 0) {
      await updateDoc(analyticsRef, updateObj).catch(() => {});
    }
  } catch (error) {
    console.error("Failed to track event:", error);
  }
};
