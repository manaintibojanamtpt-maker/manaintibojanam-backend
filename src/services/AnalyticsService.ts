import { doc, setDoc, updateDoc, increment, collection } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import {
  backfillOwnerAnalytics,
  fetchOwnerAnalytics,
  recordOwnerOrderCompletion,
} from '../lib/ownerAnalyticsApi';
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
  const response = await fetchOwnerAnalytics(tenantId);
  return response.analytics;
};

export const backfillAnalytics = async (tenantId: string) => {
  const response = await backfillOwnerAnalytics(tenantId);
  return response.analytics;
};

export const recordOrderCompletion = async (tenantId: string, order: Order) => {
  try {
    await recordOwnerOrderCompletion(tenantId, {
      totalAmount: order.totalAmount,
      userId: order.userId,
      phone: order.phone,
      status: order.status,
    });
  } catch (error) {
    console.error('Error updating analytics:', error);
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
