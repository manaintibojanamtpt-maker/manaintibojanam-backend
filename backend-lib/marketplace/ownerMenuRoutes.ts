import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { publishTenantDomainEvent } from './tenantDomainEventBus.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

type MenuStockOperation = 'reserve' | 'release';

export type MenuStockSideEffect = 'autoLocked' | 'stockAlert' | 'itemRestocked';

export function computeMenuStockUpdate(
  data: Record<string, unknown>,
  operation: MenuStockOperation,
  quantity: number,
): { updates: Record<string, unknown>; sideEffects: MenuStockSideEffect[]; stockCount: number } | null {
  if (data.stockCount === undefined) return null;

  const stockCount = Number(data.stockCount);
  if (!Number.isFinite(stockCount)) return null;

  const autoLockEnabled = data.autoLockEnabled === true;
  const lowStockThreshold =
    typeof data.lowStockThreshold === 'number' ? data.lowStockThreshold : undefined;
  const wasAvailable = data.isAvailable !== false;

  const sideEffects: MenuStockSideEffect[] = [];
  const updates: Record<string, unknown> = {};

  if (operation === 'reserve') {
    const newStock = Math.max(0, stockCount - quantity);
    updates.stockCount = newStock;

    if (newStock <= 0 && autoLockEnabled) {
      updates.isAvailable = false;
      sideEffects.push('autoLocked');
    } else if (lowStockThreshold !== undefined && newStock <= lowStockThreshold) {
      sideEffects.push('stockAlert');
    }

    return { updates, sideEffects, stockCount: newStock };
  }

  const newStock = stockCount + quantity;
  updates.stockCount = newStock;

  if (newStock > 0 && !wasAvailable && autoLockEnabled) {
    updates.isAvailable = true;
    sideEffects.push('itemRestocked');
  }

  return { updates, sideEffects, stockCount: newStock };
}

export function registerOwnerMenuRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.put('/api/owner/menu/items/:id/stock', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const itemId = typeof req.params?.id === 'string' ? req.params.id.trim() : '';
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const operation = req.body?.operation as MenuStockOperation;
      const quantity = Number(req.body?.quantity);

      if (!itemId) {
        return res.status(400).json({ success: false, error: 'Menu item id is required' });
      }
      if (!tenantId) {
        return res.status(400).json({ success: false, error: 'tenantId is required' });
      }
      if (operation !== 'reserve' && operation !== 'release') {
        return res.status(400).json({ success: false, error: 'operation must be reserve or release' });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ success: false, error: 'quantity must be a positive number' });
      }

      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const existing = await db.collection('menu').doc(itemId).get();
      if (!existing.exists) {
        return res.status(404).json({ success: false, error: 'Menu item not found' });
      }

      const data = existing.data() as Record<string, unknown>;
      const itemTenantId = typeof data.tenantId === 'string' ? data.tenantId : '';
      if (itemTenantId !== resolvedTenantId) {
        const tenantDoc = await db.collection('tenants').doc(resolvedTenantId).get();
        const slug = tenantDoc.exists
          ? String((tenantDoc.data() as { slug?: string })?.slug ?? '')
          : '';
        if (itemTenantId !== slug) {
          return res.status(403).json({ success: false, error: 'Unauthorized for this menu item' });
        }
      }

      const computed = computeMenuStockUpdate(data, operation, quantity);
      if (!computed) {
        return res.json({
          success: true,
          id: itemId,
          skipped: true,
          reason: 'stock tracking not enabled for this item',
        });
      }

      await db.collection('menu').doc(itemId).set(
        { ...computed.updates, updatedAt: fieldValue.serverTimestamp() },
        { merge: true },
      );

      await publishTenantDomainEvent(db, fieldValue, {
        tenantId: resolvedTenantId,
        type: 'MenuUpdated',
        source: `owner_menu_stock_${operation}`,
      });

      res.json({
        success: true,
        id: itemId,
        operation,
        quantity,
        stockCount: computed.stockCount,
        isAvailable:
          computed.updates.isAvailable !== undefined
            ? computed.updates.isAvailable
            : data.isAvailable !== false,
        sideEffects: computed.sideEffects,
      });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update menu stock',
      });
    }
  });
}
