import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  buildCustomerPaymentVerifiedMessage,
  buildOwnerUpiPendingMessage,
  claimCustomerUpiPayment,
  resolveOwnerNotificationPhone,
  verifyOwnerOrderPayment,
} from './ownerPaymentVerification.js';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

export interface OwnerOrdersRouteDeps {
  fieldValue: typeof FieldValue;
  sendWhatsAppNotification?: (to: string, message: string) => Promise<void>;
  notifyCustomer?: (order: Record<string, unknown>, status: string) => Promise<void>;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const FALLBACK_SCAN_LIMIT = 500;

function parseLimit(raw: unknown): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function createdAtMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object') {
    const record = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    const seconds =
      typeof record.seconds === 'number'
        ? record.seconds
        : typeof record._seconds === 'number'
          ? record._seconds
          : undefined;
    if (typeof seconds === 'number') return seconds * 1000;
    if (typeof record.toDate === 'function') {
      const date = record.toDate();
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    }
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isMissingIndexError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('FAILED_PRECONDITION') ||
    message.includes('requires an index') ||
    message.includes('The query requires an index')
  );
}

async function fetchOwnerOrders(
  db: Firestore,
  tenantId: string,
  limit: number,
): Promise<{ orders: Record<string, unknown>[]; hasMore: boolean }> {
  try {
    const snapshot = await db
      .collection('orders')
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .get();

    const hasMore = snapshot.docs.length > limit;
    const orders = snapshot.docs.slice(0, limit).map((doc) => ({ ...doc.data(), id: doc.id }));
    return { orders, hasMore };
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;

    const snapshot = await db
      .collection('orders')
      .where('tenantId', '==', tenantId)
      .limit(FALLBACK_SCAN_LIMIT)
      .get();

    const sorted = snapshot.docs
      .map((doc) => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt));

    const hasMore = sorted.length > limit;
    return { orders: sorted.slice(0, limit), hasMore };
  }
}

async function loadOrderForTenant(
  db: Firestore,
  orderId: string,
  tenantId: string,
): Promise<Record<string, unknown>> {
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    throw Object.assign(new Error('Order not found'), { statusCode: 404 });
  }
  const orderData = { id: orderDoc.id, ...orderDoc.data() } as Record<string, unknown>;
  if (String(orderData.tenantId || '') !== tenantId) {
    throw Object.assign(new Error('Order does not belong to this kitchen'), { statusCode: 403 });
  }
  return orderData;
}

export function registerOwnerOrdersRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  deps?: OwnerOrdersRouteDeps,
): void {
  app.get('/api/owner/orders', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const limit = parseLimit(req.query?.limit);
      const { orders, hasMore } = await fetchOwnerOrders(db, resolvedTenantId, limit);

      res.json({ success: true, tenantId: resolvedTenantId, orders, hasMore });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load owner orders',
      });
    }
  });

  app.post('/api/owner/orders/:orderId/verify-payment', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      if (!deps?.fieldValue) {
        return res.status(500).json({ success: false, error: 'Server misconfigured for payment verification' });
      }

      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const acceptOrder = req.body?.acceptOrder !== false;
      const upiReference =
        typeof req.body?.upiReference === 'string' ? req.body.upiReference.trim() : null;
      const notes = typeof req.body?.notes === 'string' ? req.body.notes.trim() : null;

      const result = await verifyOwnerOrderPayment(db, deps.fieldValue, {
        orderId: req.params.orderId,
        tenantId: resolvedTenantId,
        ownerUserId: req.user.uid,
        ownerEmail: req.user.email ?? null,
        acceptOrder,
        upiReference,
        notes,
      });

      const mergedOrder = await loadOrderForTenant(db, result.orderId, resolvedTenantId);

      if (!result.alreadyVerified && deps.notifyCustomer) {
        await deps.notifyCustomer(mergedOrder, result.status).catch(() => undefined);
        if (mergedOrder.phone) {
          await deps.sendWhatsAppNotification?.(
            String(mergedOrder.phone),
            buildCustomerPaymentVerifiedMessage(mergedOrder),
          ).catch(() => undefined);
        }
      } else if (result.alreadyVerified && acceptOrder && result.accepted && deps.notifyCustomer) {
        await deps.notifyCustomer(mergedOrder, 'ACCEPTED').catch(() => undefined);
      }

      res.json({ success: true, ...result });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify payment',
        code: (error as { code?: string }).code,
      });
    }
  });

  app.post('/api/marketplace/orders/:orderId/payment-claim', async (req: Request, res: Response) => {
    try {
      if (!deps?.fieldValue) {
        return res.status(500).json({ ok: false, error: { message: 'Server misconfigured' } });
      }

      const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
      const upiReference =
        typeof req.body?.upiReference === 'string' ? req.body.upiReference.trim() : '';
      if (!phone) {
        return res.status(400).json({ ok: false, error: { message: 'phone is required' } });
      }

      await claimCustomerUpiPayment(db, deps.fieldValue, {
        orderId: req.params.orderId,
        phone,
        upiReference,
      });

      const orderDoc = await db.collection('orders').doc(req.params.orderId).get();
      const orderData = orderDoc.data() as Record<string, unknown> | undefined;
      if (orderData && deps.sendWhatsAppNotification) {
        const ownerPhone = await resolveOwnerNotificationPhone(db, String(orderData.tenantId || ''));
        if (ownerPhone) {
          const orderNumber = orderData.orderNumber ?? req.params.orderId;
          const message =
            `📲 Customer says they paid\n\n` +
            `Order #${orderNumber}\n` +
            `UPI ref: ${upiReference || 'not provided'}\n\n` +
            `Open BhojanOS → Orders → Verify & Accept after checking your UPI statement.`;
          await deps.sendWhatsAppNotification(ownerPhone, message).catch(() => undefined);
        }
      }

      res.json({ ok: true, value: { recorded: true } });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        ok: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to record payment claim',
        },
      });
    }
  });
}

export async function notifyOwnerUpiOrderPending(
  db: Firestore,
  order: Record<string, unknown>,
  sendWhatsAppNotification?: (to: string, message: string) => Promise<void>,
): Promise<void> {
  if (!sendWhatsAppNotification) return;
  const tenantId = String(order.tenantId || '');
  if (!tenantId) return;
  const ownerPhone = await resolveOwnerNotificationPhone(db, tenantId);
  if (!ownerPhone) return;
  await sendWhatsAppNotification(ownerPhone, buildOwnerUpiPendingMessage(order));
}
