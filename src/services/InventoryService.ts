import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { getDb } from '../lib/firebase-db';
import { trackEvent } from './AnalyticsService';

export interface CartItemInventory {
  menuItemId: string;
  quantity: number;
}

/**
 * Stage 1: Reserve Stock (When order is placed but unpaid)
 * Deducts stock but does not lock yet, or locks if it hits 0.
 */
export const reserveStock = async (tenantId: string, items: CartItemInventory[]) => {
  try {
    const db = getDb();
    for (const item of items) {
      if (!item.menuItemId) continue;
      
      const itemRef = doc(db, 'menu', item.menuItemId);
      const itemSnap = await getDoc(itemRef);
      
      if (itemSnap.exists()) {
        const data = itemSnap.data();
        if (data.stockCount !== undefined) {
          const newStock = Math.max(0, data.stockCount - item.quantity);
          const updates: any = { stockCount: newStock };
          
          if (newStock <= 0 && data.autoLockEnabled) {
            updates.isAvailable = false;
            trackEvent(tenantId, 'autoLocked', { itemId: item.menuItemId });
          } else if (data.lowStockThreshold && newStock <= data.lowStockThreshold) {
            trackEvent(tenantId, 'stockAlert', { itemId: item.menuItemId, stock: newStock });
          }

          await updateDoc(itemRef, updates);
          trackEvent(tenantId, 'stockReserved', { itemId: item.menuItemId, qty: item.quantity });
        }
      }
    }
  } catch (error) {
    console.error("Failed to reserve stock", error);
  }
};

/**
 * Stage 2: Deduct Stock (Confirmed on payment success)
 * In this model, reservation already decremented the counter to prevent overselling. 
 * This simply finalizes the analytics tracking.
 */
export const confirmStockDeduction = async (tenantId: string, items: CartItemInventory[]) => {
  items.forEach(item => {
    trackEvent(tenantId, 'stockReduced', { itemId: item.menuItemId, qty: item.quantity });
  });
};

/**
 * Stage 3: Release/Restore Stock (Payment failed or Order Cancelled)
 * Adds the stock back to the inventory and un-locks if it was auto-locked.
 */
export const releaseStock = async (tenantId: string, items: CartItemInventory[]) => {
  try {
    const db = getDb();
    for (const item of items) {
      if (!item.menuItemId) continue;
      
      const itemRef = doc(db, 'menu', item.menuItemId);
      const itemSnap = await getDoc(itemRef);
      
      if (itemSnap.exists()) {
        const data = itemSnap.data();
        if (data.stockCount !== undefined) {
          const newStock = data.stockCount + item.quantity;
          const updates: any = { stockCount: newStock };
          
          if (newStock > 0 && !data.isAvailable && data.autoLockEnabled) {
            updates.isAvailable = true;
            trackEvent(tenantId, 'itemRestocked', { itemId: item.menuItemId });
          }

          await updateDoc(itemRef, updates);
          trackEvent(tenantId, 'stockReleased', { itemId: item.menuItemId, qty: item.quantity });
        }
      }
    }
  } catch (error) {
    console.error("Failed to release stock", error);
  }
};
