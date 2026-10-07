/**
 * Routes for business day management.
 *
 *   POST /api/v1/tenants/{tenantId}/pos/business-day/reopen
 *
 * The POS domain operation (`PosDatabase.reopenBusinessDay`) lives in the
 * client-side Dexie store and requires an Admin PIN that is not available in
 * this backend process. This route therefore returns 501 with a clear message
 * rather than silently consuming a supervisor grant for a no-op.
 */

import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  resolveActorForTenant,
  type TenantMembership,
  type VerifiedUser,
} from './registerOrderCommandRoutes';
import { METRIC, logStructured, recordCounter, resolveCorrelationId } from './orderObservability';

export interface RegisterBusinessDayRoutesOptions {
  db: Firestore;
  fieldValue: typeof FieldValue;
  /** Must verify the Firebase ID token; never trust an unverified header. */
  verifyFirebaseToken?: (token: string) => Promise<VerifiedUser>;
  getTenantMemberships?: (uid: string) => Promise<TenantMembership[]>;
  getOwnedTenantIds?: (uid: string) => Promise<string[]>;
}

const extractBearerToken = (header: unknown): string | null => {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
};

const authenticate = async (
  req: Request,
  res: Response,
  options: RegisterBusinessDayRoutesOptions,
  tenantId: string,
  correlationId: string
): Promise<{ uid: string; role: string } | null> => {
  const { verifyFirebaseToken, getTenantMemberships, getOwnedTenantIds } = options;

  if (!verifyFirebaseToken) {
    res.status(500).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Business day access is not configured.' }, correlationId });
    return null;
  }

  const token = (req.headers.authorization as string | undefined)?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in to manage business day.' }, correlationId }), null;
  }

  let user: { uid: string; email?: string; emailVerified?: boolean; role?: string };
  try {
    user = await (options.verifyFirebaseToken as (t: string) => Promise<{ uid: string; email?: string; emailVerified?: boolean; role?: string }>)(token);
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Sign in again to manage business day.' }, correlationId }), null;
  }

  const memberships = options.getTenantMemberships ? await options.getTenantMemberships(user.uid) : [];
  const tenantIds = memberships.length
    ? memberships.map((m) => m.tenantId)
    : options.getOwnedTenantIds
    ? await options.getOwnedTenantIds(user.uid)
    : [];
  const membershipRole = memberships.find((m) => m.tenantId === tenantId)?.role;

  const { resolveActorForTenant: resolveActor } = await import('./registerOrderCommandRoutes');
  const resolved = resolveActorForTenant(user, tenantId, tenantIds, membershipRole);
  if ('code' in resolved) {
    return res.status(403).json({ success: false, error: { code: resolved.code, message: resolved.message }, correlationId }), null;
  }

  return { uid: resolved.actor.uid, role: resolved.actor.role };
};

export function registerBusinessDayRoutes(
  app: Express,
  options: RegisterBusinessDayRoutesOptions
): void {
  const { db, fieldValue } = options;

  app.post('/api/v1/tenants/:tenantId/pos/business-day/reopen', async (_req: Request, res: Response) => {
    const correlationId = `corr_${Date.now()}`;
    logStructured('warn', 'business_day.reopen.disabled', { correlationId });
    return res.status(501).json({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Business-day reopen must be performed from the POS client with an Admin PIN. The backend route is intentionally disabled to avoid consuming grants for a no-op.',
      },
      correlationId,
    });
  });
}