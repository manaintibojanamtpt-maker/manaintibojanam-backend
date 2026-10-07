/**
 * Supervisor verification routes.
 *
 *   POST /api/v1/tenants/{tenantId}/pos/verify-supervisor
 *        → verifies a staff-entered code and issues a bound, short-lived grant
 *
 *   POST /api/v1/tenants/{tenantId}/pos/supervisor-grants/redeem
 *        → redeems that grant for the operation it was issued for
 *
 * Both routes require a verified Firebase ID token. The request body carries a
 * code and an operation only: it cannot name an actor, a role, or a tenant, and
 * a caller who is not a member of the tenant in the path is refused before the
 * code is even looked at. There is no anonymous fallback — an offline terminal
 * that cannot authenticate cannot obtain a grant, which is the correct outcome
 * for an approval authority.
 */

import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  SUPERVISOR_OPERATIONS,
  consumeSupervisorGrant,
  verifySupervisorCredential,
  type SupervisorVerificationFailure,
} from './supervisorVerification';
import {
  resolveActorForTenant,
  type TenantMembership,
  type VerifiedUser,
} from './registerOrderCommandRoutes';
import { logStructured } from './orderObservability';

export interface RegisterSupervisorRoutesOptions {
  db: Firestore;
  fieldValue: typeof FieldValue;
  verifyFirebaseToken?: (token: string) => Promise<VerifiedUser>;
  getTenantMemberships?: (uid: string) => Promise<TenantMembership[]>;
  getOwnedTenantIds?: (uid: string) => Promise<string[]>;
}

const STATUS_BY_FAILURE: Record<SupervisorVerificationFailure, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN_TENANT: 403,
  INVALID_OPERATION: 400,
  NO_CREDENTIAL_CONFIGURED: 503,
  INVALID_CODE: 401,
  RATE_LIMITED: 429,
  CREDENTIAL_MISMATCH: 401,
};

/**
 * A refusal is answered with a generic message for credential problems. Whether
 * a tenant has a supervisor configured is not something an unauthenticated-ish
 * caller should be able to enumerate, so `NO_CREDENTIAL_CONFIGURED` and
 * `INVALID_CODE` share one message while the code, status and audit record keep
 * them apart for an operator.
 */
const MESSAGE_BY_FAILURE: Record<SupervisorVerificationFailure, string> = {
  UNAUTHENTICATED: 'Sign in before requesting supervisor approval.',
  FORBIDDEN_TENANT: 'You are not a member of this tenant.',
  INVALID_OPERATION: `operation must be one of ${SUPERVISOR_OPERATIONS.join(', ')}.`,
  NO_CREDENTIAL_CONFIGURED: 'That supervisor code was not accepted.',
  INVALID_CODE: 'That supervisor code was not accepted.',
  RATE_LIMITED: 'Too many attempts. Wait before trying the supervisor code again.',
  CREDENTIAL_MISMATCH: 'That supervisor code was not accepted.',
};

const extractBearerToken = (header: unknown): string | null => {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
};

interface ActorContext {
  uid: string;
  role: string;
}

const authenticate = async (
  req: Request,
  res: Response,
  options: RegisterSupervisorRoutesOptions,
  tenantId: string
): Promise<ActorContext | null> => {
  const { verifyFirebaseToken, getTenantMemberships, getOwnedTenantIds } = options;

  if (!verifyFirebaseToken) {
    res.status(500).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Supervisor verification is not configured.' },
    });
    return null;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: MESSAGE_BY_FAILURE.UNAUTHENTICATED },
    });
    return null;
  }

  let user: VerifiedUser;
  try {
    user = await verifyFirebaseToken(token);
  } catch {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: MESSAGE_BY_FAILURE.UNAUTHENTICATED },
    });
    return null;
  }

  const memberships = getTenantMemberships ? await getTenantMemberships(user.uid) : [];
  const tenantIds = memberships.length
    ? memberships.map((membership) => membership.tenantId)
    : getOwnedTenantIds
      ? await getOwnedTenantIds(user.uid)
      : [];
  const membershipRole = memberships.find((membership) => membership.tenantId === tenantId)?.role;

  const resolved = resolveActorForTenant(user, tenantId, tenantIds, membershipRole);
  if ('code' in resolved) {
    res.status(resolved.code === 'FORBIDDEN_TENANT' ? 403 : 403).json({
      success: false,
      error: { code: resolved.code, message: resolved.message },
    });
    return null;
  }

  return { uid: resolved.actor.uid, role: resolved.actor.role };
};

export function registerSupervisorRoutes(app: Express, options: RegisterSupervisorRoutesOptions): void {
  const { db, fieldValue } = options;

  app.post('/api/v1/tenants/:tenantId/pos/verify-supervisor', async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const actor = await authenticate(req, res, options, tenantId);
    if (!actor) return;

    const result = await verifySupervisorCredential({
      db,
      fieldValue,
      tenantId,
      operation: body.operation,
      code: body.code,
      actorUid: actor.uid,
      actorRole: actor.role,
      correlationId: String(req.headers['x-correlation-id'] ?? '').trim() || `sv_${Date.now()}`,
    });

    // `in` rather than `!result.ok`: this project compiles without
    // `strictNullChecks`, where a boolean discriminant does not narrow.
    if ('code' in result) {
      const status = STATUS_BY_FAILURE[result.code] ?? 400;
      // `Retry-After` is set on a lockout so a terminal can back off properly
      // instead of retrying into the same refusal.
      if (result.code === 'RATE_LIMITED') {
        const retryAfterMs = result.retryAfterMs ?? 0;
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil(retryAfterMs / 1000))));
      }
      return res.status(status).json({
        success: false,
        verified: false,
        error: { code: result.code, message: MESSAGE_BY_FAILURE[result.code] },
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      // Compatibility with the client's original contract. It is the actor's
      // uid, not a supervisor PIN holder's identity: an approval is attributed to
      // the signed-in staff member who obtained it.
      supervisorId: result.grant.actorUid,
      grant: {
        token: result.grant.token,
        operation: result.grant.operation,
        tenantId: result.grant.tenantId,
        actorUid: result.grant.actorUid,
        expiresAt: new Date(result.grant.expiresAt).toISOString(),
      },
    });
  });

  app.post('/api/v1/tenants/:tenantId/pos/supervisor-grants/redeem', async (req: Request, res: Response) => {
    const { tenantId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    const actor = await authenticate(req, res, options, tenantId);
    if (!actor) return;

    const result = await consumeSupervisorGrant(db, fieldValue, {
      token: body.token,
      tenantId,
      operation: body.operation,
      actorUid: actor.uid,
    });

    if ('code' in result) {
      logStructured('warn', 'supervisor.grant_redeem_refused', {
        tenantId,
        actorUid: actor.uid,
        code: result.code,
      });
      return res.status(result.code === 'GRANT_MISMATCH' ? 403 : 401).json({
        success: false,
        error: { code: result.code, message: 'That supervisor approval is no longer valid.' },
      });
    }

    logStructured('info', 'supervisor.grant_redeemed', {
      tenantId,
      actorUid: actor.uid,
      operation: result.grant.operation,
    });
    return res.status(200).json({
      success: true,
      operation: result.grant.operation,
      tenantId: result.grant.tenantId,
      actorUid: result.grant.actorUid,
    });
  });
}