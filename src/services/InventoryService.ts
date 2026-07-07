import { updateOwnerMenuItemStock } from '../lib/ownerMenuApi';
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
    for (const item of items) {
      if (!item.menuItemId) continue;

      const result = await updateOwnerMenuItemStock(
        tenantId,
        item.menuItemId,
        'reserve',
        item.quantity,
      );

      if (result.skipped) continue;

      for (const effect of result.sideEffects ?? []) {
        if (effect === 'autoLocked') {
          trackEvent(tenantId, 'autoLocked', { itemId: item.menuItemId });
        } else if (effect === 'stockAlert') {
          trackEvent(tenantId, 'stockAlert', {
            itemId: item.menuItemId,
            stock: result.stockCount,
          });
        }
      }

      trackEvent(tenantId, 'stockReserved', { itemId: item.menuItemId, qty: item.quantity });
    }
  } catch (error) {
    console.error('Failed to reserve stock', error);
  }
};

/**
 * Stage 2: Deduct Stock (Confirmed on payment success)
 * In this model, reservation already decremented the counter to prevent overselling.
 * This simply finalizes the analytics tracking.
 */
export const confirmStockDeduction = async (tenantId: string, items: CartItemInventory[]) => {
  items.forEach((item) => {
    trackEvent(tenantId, 'stockReduced', { itemId: item.menuItemId, qty: item.quantity });
  });
};

/**
 * Stage 3: Release/Restore Stock (Payment failed or Order Cancelled)
 * Adds the stock back to the inventory and un-locks if it was auto-locked.
 */
export const releaseStock = async (tenantId: string, items: CartItemInventory[]) => {
  try {
    for (const item of items) {
      if (!item.menuItemId) continue;

      const result = await updateOwnerMenuItemStock(
        tenantId,
        item.menuItemId,
        'release',
        item.quantity,
      );

      if (result.skipped) continue;

      if (result.sideEffects?.includes('itemRestocked')) {
        trackEvent(tenantId, 'itemRestocked', { itemId: item.menuItemId });
      }

      trackEvent(tenantId, 'stockReleased', { itemId: item.menuItemId, qty: item.quantity });
    }
  } catch (error) {
    console.error('Failed to release stock', error);
  }
};
