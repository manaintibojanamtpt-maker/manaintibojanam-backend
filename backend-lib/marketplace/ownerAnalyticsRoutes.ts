import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

const EXCLUDED_ORDER_STATUSES = new Set(['CANCELLED', 'EXPIRED', 'FAILED_DELIVERY']);

export interface TenantAnalyticsOverview {
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
  lastUpdated: unknown;
}

interface BackfillSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerCount: number;
  repeatCustomers: number;
  lastUpdated: Date;
}

function analyticsDocRef(db: Firestore, tenantId: string) {
  return db.doc(`tenants/${tenantId}/analytics/overview`);
}

async function computeAnalyticsFromOrders(db: Firestore, tenantId: string): Promise<BackfillSummary> {
  const snapshot = await db.collection('orders').where('tenantId', '==', tenantId).get();

  let totalRevenue = 0;
  let totalOrders = 0;
  const customers = new Set<string>();
  const repeatSet = new Set<string>();

  snapshot.docs.forEach((docSnap) => {
    const order = docSnap.data() as Record<string, unknown>;
    const status = String(order.status ?? '');
    if (EXCLUDED_ORDER_STATUSES.has(status)) return;

    totalRevenue += Number(order.totalAmount ?? 0);
    totalOrders += 1;

    const customerKey =
      (typeof order.userId === 'string' && order.userId) ||
      (typeof order.phone === 'string' && order.phone) ||
      '';
    if (customerKey) {
      if (customers.has(customerKey)) {
        repeatSet.add(customerKey);
      } else {
        customers.add(customerKey);
      }
    }
  });

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    customerCount: customers.size,
    repeatCustomers: repeatSet.size,
    lastUpdated: new Date(),
  };
}

async function backfillTenantAnalytics(db: Firestore, tenantId: string): Promise<BackfillSummary> {
  const summary = await computeAnalyticsFromOrders(db, tenantId);
  await analyticsDocRef(db, tenantId).set(summary);
  return summary;
}

export function registerOwnerAnalyticsRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
  fieldValue: typeof FieldValue,
): void {
  app.get('/api/owner/analytics', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.query?.tenantId === 'string' ? req.query.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);

      const snapshot = await analyticsDocRef(db, resolvedTenantId).get();
      const analytics = snapshot.exists
        ? ({ id: snapshot.id, ...(snapshot.data() as Record<string, unknown>) } as TenantAnalyticsOverview)
        : null;

      res.json({ success: true, tenantId: resolvedTenantId, analytics });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load owner analytics',
      });
    }
  });

  app.post('/api/owner/analytics/backfill', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const analytics = await backfillTenantAnalytics(db, resolvedTenantId);
      res.json({ success: true, tenantId: resolvedTenantId, analytics });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to backfill owner analytics',
      });
    }
  });

  app.post('/api/owner/analytics/order-completion', verifyFirebaseToken, async (req: any, res: Response) => {
    try {
      const tenantId = typeof req.body?.tenantId === 'string' ? req.body.tenantId.trim() : '';
      const resolvedTenantId = await assertOwnerTenantAccess(req.user.uid, tenantId, req.user.email);
      const order = (req.body?.order ?? {}) as Record<string, unknown>;
      const amount = Number(order.totalAmount ?? 0);

      const ref = analyticsDocRef(db, resolvedTenantId);
      try {
        await ref.update({
          totalRevenue: fieldValue.increment(amount),
          totalOrders: fieldValue.increment(1),
          lastUpdated: new Date(),
        });
      } catch {
        await backfillTenantAnalytics(db, resolvedTenantId);
      }

      res.json({ success: true, tenantId: resolvedTenantId });
    } catch (error: unknown) {
      const status = (error as { statusCode?: number }).statusCode ?? 500;
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record order completion analytics',
      });
    }
  });
}
