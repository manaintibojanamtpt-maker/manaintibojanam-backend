import type { Express, Request, Response } from 'express';
import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

type OwnerAccessFn = (
  userId: string,
  tenantId: string,
  email?: string,
) => Promise<string>;

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
    const record = value as { seconds?: number; toDate?: () => Date };
    if (typeof record.seconds === 'number') return record.seconds * 1000;
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
      .map((doc: QueryDocumentSnapshot) => ({ ...doc.data(), id: doc.id }))
      .sort((a, b) => createdAtMillis(b.createdAt) - createdAtMillis(a.createdAt));

    const hasMore = sorted.length > limit;
    return { orders: sorted.slice(0, limit), hasMore };
  }
}

export function registerOwnerOrdersRoutes(
  app: Express,
  db: Firestore,
  verifyFirebaseToken: (req: Request, res: Response, next: () => void) => void,
  assertOwnerTenantAccess: OwnerAccessFn,
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
}
