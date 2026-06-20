import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore';
import { getDb, handleFirestoreError, OperationType } from '../lib/firebase-db';
import { MenuItem, Order, UserProfile, OrderStatus, OrderTimelineEvent } from '../types';
import { safeParseDate } from '../lib/utils';
import { getOrderDisplayState, normalizePaymentStatus } from '../lib/orderDisplay';

const API_BASE_URL = 'https://manaintibojanam-backend.onrender.com';

export let activeTenantId = 'mana-inti';
export const setActiveTenantId = (id: string) => { activeTenantId = id; };

import { auth } from '../firebase';

// Correlation ID wrapper for fetch
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  const generateId = () => {
    try { return crypto.randomUUID(); } 
    catch(e) { return 'flow-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); }
  };
  let sessionCorrelationId = generateId();

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : input.toString());
    
    if (url.includes(API_BASE_URL) || url.startsWith('/api/')) {
      const headers = new Headers(init?.headers || {});
      if (!headers.has('X-Correlation-ID')) {
        headers.set('X-Correlation-ID', sessionCorrelationId);
      }
      
      // Attach Firebase ID Token
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers.set('Authorization', `Bearer ${token}`);
        } catch (e) {
          console.warn("Failed to get Firebase token for API request", e);
        }
      }
      
      return originalFetch.call(window, input, { ...init, headers });
    }
    
    return originalFetch.call(window, input, init);
  };
}

export const pingBackend = () => {
  fetch(`${API_BASE_URL}/api/health`).catch(() => {});
};

// --- MENU API ---

export const fetchMenu = async (tenantId?: string): Promise<MenuItem[]> => {
  const path = 'menu';
  const cacheKey = `mib_menu_${tenantId || 'global'}`;
  
  try {
    let q;
    if (tenantId) {
      q = query(collection(getDb(), path), where('tenantId', '==', tenantId));
    } else {
      q = query(collection(getDb(), path));
    }
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MenuItem));
    
    // Sort in memory to avoid missing field omissions and composite index requirements
    results.sort((a, b) => {
      const dateA = a.createdAt?.seconds || 0;
      const dateB = b.createdAt?.seconds || 0;
      return dateB - dateA;
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(results));
    }
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.warn('Network failed for fetchMenu, serving from local cache');
        return JSON.parse(cached);
      }
    }
    return [];
  }
};

// --- USER API ---

const buildTimelineEvent = (
  orderId: string,
  eventType: OrderTimelineEvent['eventType'],
  description: string,
  newStatus?: OrderStatus,
  previousStatus?: OrderStatus | null,
  triggeredBy: 'system' | 'admin' | 'customer' | 'courier' = 'system',
  metadata: Record<string, any> = {}
): OrderTimelineEvent => ({
  id: `${orderId}-${eventType}-${Date.now()}`,
  eventType,
  description,
  previousStatus: previousStatus || undefined,
  newStatus,
  triggeredBy,
  metadata,
  timestamp: new Date()
});

const generateReferralCode = (name: string) => {
  const base = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${base || 'USER'}${random}`;
};

export const saveUserIfNotExists = async (user: { uid: string, email: string | null, displayName: string | null, phone: string | null }): Promise<UserProfile> => {
  const path = `users/${user.uid}`;
  try {
    const userDoc = await getDoc(doc(getDb(), 'users', user.uid));
    if (!userDoc.exists()) {
      const referralCode = generateReferralCode(user.displayName || 'USER');
      
      const newUser: UserProfile = {
        userId: user.uid,
        name: user.displayName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: '',
        role: 'user',
        referralCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(getDb(), 'users', user.uid), newUser);
      
      try {
        await setDoc(doc(getDb(), 'referrals', user.uid), {
          userId: user.uid,
          referralCode,
          referredUsers: [],
          totalEarnings: 0,
          discountGiven: 0,
          createdAt: serverTimestamp()
        });
      } catch (refErr) {
        console.error("Failed to create referral doc:", refErr);
      }
      
      return newUser;
    } else {
      const userData = userDoc.data() as UserProfile;
      if (!userData.referralCode) {
        const referralCode = generateReferralCode(userData.name || 'USER');
        await updateDoc(doc(getDb(), 'users', user.uid), { referralCode });
        
        try {
          await setDoc(doc(getDb(), 'referrals', user.uid), {
            userId: user.uid,
            referralCode,
            referredUsers: [],
            totalEarnings: 0,
            discountGiven: 0,
            createdAt: serverTimestamp()
          });
        } catch (refErr) {
          console.error("Failed to create referral doc:", refErr);
        }
        return { id: userDoc.id, ...userData, referralCode } as unknown as UserProfile;
      }
      return { id: userDoc.id, ...userData } as unknown as UserProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return user as any;
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const path = `users/${userId}`;
  try {
    const userDoc = await getDoc(doc(getDb(), 'users', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as unknown as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const updateUserProfile = async (userId: string, data: Partial<UserProfile>): Promise<void> => {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(getDb(), 'users', userId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// --- ORDER API ---

export const prepareOrderBlueprint = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
  const scheduledForIso = orderData.scheduledFor ? safeParseDate(orderData.scheduledFor).toISOString() : null;
  const isScheduled = String(orderData.orderType || orderData.deliveryType || '').toLowerCase() === 'scheduled';

  if (isScheduled && !scheduledForIso) {
    throw new Error('Scheduled orders must include a valid scheduledFor timestamp.');
  }

  return {
    ...orderData,
    orderType: orderData.orderType || (isScheduled ? 'scheduled' : 'instant'),
    isScheduled,
    scheduledFor: scheduledForIso,
    scheduledTime: isScheduled ? safeParseDate(scheduledForIso).toISOString() : null,
    scheduledDate: scheduledForIso ? safeParseDate(scheduledForIso).toISOString().split('T')[0] : null,
    prepAlertSent: orderData.prepAlertSent ?? false,
  };
};

export const stageOrderDraft = async (
  orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
  subscriptionData?: any
): Promise<string> => {
  const path = 'order_drafts';
  try {
    const draftRef = doc(collection(getDb(), path));
    const orderPayload = prepareOrderBlueprint(orderData);
    
    const expiresAtDate = new Date();
    expiresAtDate.setHours(expiresAtDate.getHours() + 24);

    await setDoc(draftRef, {
      id: draftRef.id,
      orderPayload,
      subscriptionPayload: subscriptionData || null,
      status: 'pending_payment',
      createdAt: serverTimestamp(),
      expiresAt: expiresAtDate
    });
    
    return draftRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, path);
    throw new Error('Failed to stage order. Please try again.');
  }
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const path = 'orders';
  try {
    const orderRef = doc(collection(getDb(), path));
    const newOrder = {
      ...prepareOrderBlueprint(orderData),
      id: orderRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      timeline: [
        buildTimelineEvent(
          orderRef.id,
          'status_change',
          'Order placed',
          orderData.status,
          null,
          'customer'
        )
      ]
    };
    await setDoc(orderRef, newOrder);
    
    // Trigger notification when order is placed
    notifyOrderStatusChange(orderRef.id, newOrder.status as OrderStatus).catch(() => {});
    
    return orderRef.id;
  } catch (error: any) {
    handleFirestoreError(error, OperationType.CREATE, path);
    let errorMessage = 'Order creation failed. Please try again.';
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      errorMessage = 'Network issue. Please retry.';
    } else if (error?.code === 'permission-denied') {
      errorMessage = 'Permission denied. Please check your details.';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    throw new Error(errorMessage);
  }
};

export const fetchOrders = async (userId?: string): Promise<Order[]> => {
  const path = 'orders';
  try {
    let q = query(collection(getDb(), path), orderBy('createdAt', 'desc'));
    if (userId) {
      q = query(collection(getDb(), path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    // Check for expired orders and update them (ONLY for online orders)
    const now = Date.now();
    const expiredOrders = orders.filter(order => {
      if (order.status === OrderStatus.EXPIRED) return false;
      // COD orders should NEVER expire
      if (order.paymentMethod === 'cod' || order.isCOD) return false;
      const expiresAt = safeParseDate(order.expiresAt).getTime();
      return now > expiresAt;
    });
    
    // Update expired orders
    for (const order of expiredOrders) {
      try {
        await updateDoc(doc(getDb(), 'orders', order.id), {
          status: OrderStatus.EXPIRED,
          paymentStatus: 'expired',
          updatedAt: serverTimestamp()
        });
        order.status = OrderStatus.EXPIRED;
        order.paymentStatus = 'expired';
      } catch (error) {
        console.error('Failed to update expired order:', order.id, error);
      }
    }
    
    return orders;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

const normalizeOrderStatus = (value: string | OrderStatus | undefined | null): OrderStatus | null => {
  if (!value) return null;
  let normalized = String(value).trim();
  if (!normalized) return null;

  if (normalized === 'placed') return OrderStatus.PENDING;
  if (normalized === 'pending_payment') return OrderStatus.PAYMENT_PENDING;
  if (normalized === 'payment_pending_verification') return OrderStatus.PAYMENT_VERIFICATION;

  normalized = normalized.toUpperCase().replace(/\s+/g, '_');
  const valid = Object.values(OrderStatus).includes(normalized as OrderStatus);
  return valid ? (normalized as OrderStatus) : null;
};

const notifyOrderStatusChange = async (orderId: string, status: OrderStatus) => {
  try {
    await fetch(`${API_BASE_URL}/api/orders/${orderId}/notify-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  } catch (error) {
    console.warn('[api] Status notification request skipped or failed:', error);
  }
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus, trackingData?: Record<string, any>): Promise<void> => {
  const path = `orders/${orderId}`;
  try {
    // Status Flow Validation
    const orderDoc = await getDoc(doc(getDb(), 'orders', orderId));
    if (!orderDoc.exists()) throw new Error('Order not found');
    
    const orderData = orderDoc.data();
    const currentStatusRaw = orderData.status as string;
    const currentStatus = normalizeOrderStatus(currentStatusRaw);
    const targetStatus = normalizeOrderStatus(status);

    if (!currentStatus) {
      throw new Error(`Order has invalid current status: ${String(currentStatusRaw)}`);
    }
    if (!targetStatus) {
      throw new Error(`Target status is invalid: ${String(status)}`);
    }

    if (currentStatus === targetStatus) {
      await updateDoc(doc(getDb(), 'orders', orderId), {
        updatedAt: serverTimestamp(),
        ...(trackingData || {}),
      });
      return;
    }

    const normalizedPayment = normalizePaymentStatus(orderData.paymentStatus as string);
    if ((normalizedPayment === 'failed' || normalizedPayment === 'expired') && targetStatus !== OrderStatus.EXPIRED && targetStatus !== OrderStatus.CANCELLED) {
      throw new Error('Cannot update order status after payment has failed or expired.');
    }

    const scheduledFor = orderData.scheduledFor ? safeParseDate(orderData.scheduledFor) : orderData.scheduledTime ? safeParseDate(orderData.scheduledTime) : null;
    const isScheduledOrder = orderData.orderType === 'scheduled' || String(orderData.deliveryType || '').toLowerCase() === 'scheduled';
    if (isScheduledOrder && scheduledFor) {
      const prepStart = new Date(scheduledFor.getTime() - 60 * 60000).getTime();
      // Allow admin to manually advance scheduled orders, but prevent automatic delivery before prep window
      if (Date.now() < prepStart && [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED].includes(targetStatus)) {
        throw new Error('Cannot deliver a scheduled order before its prep window opens.');
      }
    }

    // Allow PENDING -> PREPARING when admin explicitly advances an order.
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PREPARING, OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED, OrderStatus.PAYMENT_VERIFICATION, OrderStatus.ACCEPTED, OrderStatus.EXPIRED],
      [OrderStatus.PAYMENT_PENDING]: [OrderStatus.PAYMENT_VERIFICATION, OrderStatus.CANCELLED, OrderStatus.PREPARING, OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.EXPIRED],
      [OrderStatus.PAYMENT_VERIFICATION]: [OrderStatus.PREPARING, OrderStatus.CANCELLED, OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING, OrderStatus.ACCEPTED, OrderStatus.EXPIRED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
      [OrderStatus.READY]: [OrderStatus.COURIER_BOOKED, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.COURIER_BOOKED]: [OrderStatus.PICKED_UP, OrderStatus.FAILED_DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.PICKED_UP]: [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.FAILED_DELIVERY],
      [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.FAILED_DELIVERY]: [OrderStatus.COURIER_BOOKED, OrderStatus.CANCELLED],
      [OrderStatus.EXPIRED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.CREATED]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.SCHEDULED, OrderStatus.CANCELLED],
      [OrderStatus.SCHEDULED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.DISPATCHED]: [OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY, OrderStatus.CANCELLED],
      // Customers can confirm manual payment after placing.
      [OrderStatus.PLACED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_VERIFICATION, OrderStatus.ACCEPTED, OrderStatus.CANCELLED, OrderStatus.EXPIRED],
      [OrderStatus.ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED]
    };

    if (!validTransitions[currentStatus].includes(targetStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${targetStatus}`);
    }

    const updatePayload: Record<string, any> = {
      status: targetStatus,
      updatedAt: serverTimestamp(),
      ...(trackingData || {}),
      timeline: arrayUnion(
        buildTimelineEvent(
          orderId,
          'status_change',
          `Order moved from ${currentStatus} to ${targetStatus}`,
          targetStatus,
          currentStatus,
          'admin',
          trackingData || {}
        )
      )
    };

    await updateDoc(doc(getDb(), 'orders', orderId), updatePayload);
    notifyOrderStatusChange(orderId, targetStatus).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: Order['paymentStatus'],
  extras: Record<string, any> = {},
  triggeredBy: 'system' | 'admin' | 'customer' = 'admin'
): Promise<void> => {
  const path = `orders/${orderId}`;
  try {
    const normalizedPayment = normalizePaymentStatus(paymentStatus as string);
    const eventType = normalizedPayment === 'success' ? 'payment_verified' : normalizedPayment === 'failed' || normalizedPayment === 'expired' ? 'payment_failed' : 'status_change';
    const description = normalizedPayment === 'success'
      ? 'Payment verified'
      : normalizedPayment === 'failed'
      ? 'Payment failed'
      : normalizedPayment === 'expired'
      ? 'Payment session expired'
      : `Payment status updated to ${normalizedPayment}`;

    await updateDoc(doc(getDb(), 'orders', orderId), {
      paymentStatus: normalizedPayment,
      updatedAt: serverTimestamp(),
      ...extras,
      timeline: arrayUnion(
        buildTimelineEvent(
          orderId,
          eventType,
          description,
          undefined,
          undefined,
          triggeredBy,
          { paymentStatus: normalizedPayment, ...extras }
        )
      )
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// --- REAL-TIME LISTENERS ---

export const subscribeToGuestOrders = (orderIds: string[], callback: (orders: Order[]) => void) => {
  if (!orderIds || orderIds.length === 0) {
    callback([]);
    return () => {};
  }
  // chunk orderIds into batches of 10 if necessary, but for now just slice 10
  const slicedIds = orderIds.slice(0, 10);
  const q = query(collection(getDb(), 'orders'), where('__name__', 'in', slicedIds));
  
  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    orders.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });
    callback(orders);
  });
};

export const subscribeToOrders = (callback: (orders: Order[]) => void, userId?: string, onError?: (error: any) => void) => {
  const path = 'orders';
  let q = query(collection(getDb(), path), orderBy('createdAt', 'desc'));
  if (userId) {
    q = query(collection(getDb(), path), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, async (snapshot) => {
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    console.log('[API] Fetched orders for user:', userId, 'Count:', orders.length);
    console.log('[API] Raw orders:', orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      deliveryType: o.deliveryType,
      isCOD: o.isCOD
    })));
    
    // Auto-handle expired pending orders (ONLY for online orders)
    const now = Date.now();
    const expirableStatuses = [OrderStatus.PLACED, OrderStatus.PENDING, OrderStatus.PAYMENT_PENDING, OrderStatus.PAYMENT_VERIFICATION];
    for (const order of orders) {
      if (order.expiresAt && expirableStatuses.includes(order.status as OrderStatus)) {
        // COD orders should NEVER expire
        if (order.paymentMethod === 'cod' || order.isCOD) continue;
        
        const expiresAt = safeParseDate(order.expiresAt).getTime();
        if (now > expiresAt && order.status !== OrderStatus.EXPIRED) {
          try {
            await updateDoc(doc(getDb(), 'orders', order.id), {
              status: OrderStatus.EXPIRED,
              paymentStatus: 'expired',
              updatedAt: serverTimestamp(),
              timeline: arrayUnion(
                buildTimelineEvent(
                  order.id,
                  'payment_failed',
                  'Order expired before payment confirmation',
                  OrderStatus.EXPIRED,
                  order.status as OrderStatus,
                  'system',
                  { expiredAt: order.expiresAt }
                )
              )
            });
            order.status = OrderStatus.EXPIRED;
            order.paymentStatus = 'expired';
          } catch (error) {
            console.error(`[api] Failed to expire order ${order.id}:`, error);
          }
        }
      }
    }
    
    console.log('[API] Calling callback with', orders.length, 'orders');
    callback(orders);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
    if (onError) onError(error);
  });
};

export const subscribeToOrder = (orderId: string, callback: (order: Order | null) => void) => {
  const path = `orders/${orderId}`;
  return onSnapshot(doc(getDb(), 'orders', orderId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Order);
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, path);
  });
};

// --- DELIVERY FEE LOGIC ---

export const calculateDeliveryFee = (distance?: number): number => {
  const baseFee = 20;
  const perKmRate = 16;
  const fallbackFee = 40;

  if (distance === undefined || distance === null) {
    return fallbackFee;
  }

  return baseFee + (distance * perKmRate);
};

// --- UI HELPERS ---

export const getDisplayStatus = (status: OrderStatus): string => {
  const mapping: Record<OrderStatus, string> = {
    [OrderStatus.PLACED]: 'Placed',
    [OrderStatus.PENDING]: 'Pending',
    [OrderStatus.PAYMENT_PENDING]: 'Payment Pending',
    [OrderStatus.PAYMENT_VERIFICATION]: 'Verifying Payment',
    [OrderStatus.ACCEPTED]: 'Accepted',
    [OrderStatus.PREPARING]: 'Preparing',
    [OrderStatus.READY]: 'Ready for Pickup',
    [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
    [OrderStatus.DELIVERED]: 'Delivered',
    [OrderStatus.CANCELLED]: 'Cancelled',
    [OrderStatus.EXPIRED]: 'Expired',
    [OrderStatus.CREATED]: 'Created',
    [OrderStatus.CONFIRMED]: 'Confirmed',
    [OrderStatus.SCHEDULED]: 'Scheduled',
    [OrderStatus.DISPATCHED]: 'Dispatched',
    [OrderStatus.COURIER_BOOKED]: 'Courier Booked',
    [OrderStatus.PICKED_UP]: 'Picked Up',
    [OrderStatus.FAILED_DELIVERY]: 'Failed Delivery',
    [OrderStatus.ACTIVE]: 'Active'
  };
  return mapping[status] || status;
};

export interface RepeatOrderLine { id: string; name: string; quantity: number; price: number; }
export interface RepeatOrderBundle { id: string; orderId: string; date: string; items: RepeatOrderLine[]; totalAmount: number; }
export const fetchRepeatOrderRailData = async (userId: string): Promise<any> => ({ items: [], bundles: [] });

export const buildRepeatOrderLines = (orderItems: any[], menuItems: any[]) => {
  const lines: any[] = [];
  orderItems.forEach(orderItem => {
    const liveItem = menuItems.find((m: any) => m.id === orderItem.id);
    if (!liveItem) return;
    if (liveItem.isAvailable === false) return;

    const selectedAddons: any[] = [];
    const missingAddonNames: string[] = [];

    (orderItem.selectedAddons || []).forEach((addon: any) => {
      let found = false;
      if (liveItem.customizations) {
         liveItem.customizations.forEach((cust: any) => {
            const opt = cust.options.find((o: any) => o.name === addon.name);
            if (opt && opt.isAvailable !== false) {
              selectedAddons.push({
                 groupId: cust.id,
                 groupName: cust.name,
                 id: opt.id,
                 name: opt.name,
                 price: opt.price
              });
              found = true;
            }
         });
      }
      if (!found) {
        missingAddonNames.push(addon.name);
      }
    });

    lines.push({
       item: liveItem,
       quantity: orderItem.quantity || 1,
       selectedAddons,
       missingAddonNames
    });
  });
  return lines;
};

import { deleteDoc, addDoc } from 'firebase/firestore';

export const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
  const finalTenantId = (item as any).tenantId || activeTenantId;
  return addDoc(collection(getDb(), 'menu'), { ...item, tenantId: finalTenantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
};

export const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
  return updateDoc(doc(getDb(), 'menu', id), { ...updates, updatedAt: serverTimestamp() });
};

export const deleteMenuItem = async (id: string) => {
  return deleteDoc(doc(getDb(), 'menu', id));
};

export const fetchAllTenants = async () => {
  const q = query(collection(getDb(), 'tenants'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateTenantStatus = async (tenantId: string, status: string) => {
  return updateDoc(doc(getDb(), 'tenants', tenantId), { status, updatedAt: serverTimestamp() });
};

export const fetchOnboardingLeads = async () => {
  const q = query(collection(getDb(), 'salesPipeline'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateLeadStage = async (leadId: string, stage: string) => {
  return updateDoc(doc(getDb(), 'salesPipeline', leadId), { stage, updatedAt: serverTimestamp() });
};
