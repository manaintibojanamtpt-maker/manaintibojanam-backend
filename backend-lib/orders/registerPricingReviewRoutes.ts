/**
 * Routes for the unverified-pricing review queue.
 *
 *   GET  /api/v1/tenants/{tenantId}/pricing-reviews
 *   POST /api/v1/tenants/{tenantId}/pricing-reviews/{eventId}
 *
 * Both routes authenticate with a verified Firebase ID token and derive the
 * actor from that token plus the tenant membership record. The request body
 * carries only the decision and a reason: it cannot name an actor, a role, or a
 * tenant. Authorization for the decision itself (owner or manager) lives in
 * `resolvePricingReview`, so it is enforced identically however it is called.
 */

import type { Express, Request, Response } from 'express';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import {
  resolvePricingReview,
  listPendingPricingReviews,
  type PricingReviewDecision,
  type PricingReviewErrorCode,
} from './pricingReviewService';
import {
  resolveActorForTenant,
  type TenantMembership,
  type VerifiedUser,
} from './registerOrderCommandRoutes';
import { METRIC, logStructured, recordCounter, resolveCorrelationId } from './orderObservability';
import { consumeSupervisorGrant } from './supervisorVerification';

export interface RegisterPricingReviewRoutesOptions {
  db: Firestore;
  fieldValue: typeof FieldValue;
  /** Must verify the Firebase ID token; never trust an unverified header. */
  verifyFirebaseToken?: (token: string) => Promise<VerifiedUser>;
  getTenantMemberships?: (uid: string) => Promise<TenantMembership[]>;
  getOwnedTenantIds?: (uid: string) => Promise<string[]>;
}

const STATUS_BY_CODE: Record<PricingReviewErrorCode | 'INTERNAL_ERROR', number> = {
  INVALID_DECISION: 400,
  REASON_REQUIRED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN_ROLE: 403,
  NOT_FOUND: 404,
  TENANT_MISMATCH: 404,
  ALREADY_RESOLVED: 409,
  NOT_REQUIRED: 409,
  GRANT_INVALID: 401,
  GRANT_EXPIRED: 401,
  GRANT_CONSUMED: 401,
  GRANT_MISMATCH: 403,
  INTERNAL_ERROR: 500,
};

const errorBody = (
  code: PricingReviewErrorCode | 'INTERNAL_ERROR',
  message: string,
  correlationId: string
) => ({ success: false, error: { code, message, retryable: false }, correlationId });

/**
 * Status for an authorization failure raised before the request reaches the
 * service. These codes come from the shared actor resolver, not from
 * `PricingReviewErrorCode`, so they are mapped explicitly rather than folded
 * into one table — an unknown auth code must not fall through to a 200.
 */
const STATUS_BY_AUTH_CODE: Record<string, number> = {
  FORBIDDEN_TENANT: 403,
  FORBIDDEN_ROLE: 403,
  UNAUTHENTICATED: 401,
};

const extractBearerToken = (header: unknown): string | null => {
  const raw = Array.isArray(header) ? header[0] : header;
  if (typeof raw !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return match ? match[1].trim() : null;
};

/**
 * Authenticate the request and resolve the actor for `tenantId`.
 *
 * Returns either the actor, or the response that should be sent. Kept as one
 * helper because both routes must reject exactly the same set of callers: any
 * divergence between "who may see the review queue" and "who may decide a review"
 * would be an authorization bug.
 */
const authenticate = async (
  req: Request,
  res: Response,
  options: RegisterPricingReviewRoutesOptions,
  tenantId: string,
  correlationId: string
): Promise<{ uid: string; role: string } | null> => {
  const { verifyFirebaseToken, getTenantMemberships, getOwnedTenantIds } = options;

  if (!verifyFirebaseToken) {
    res
      .status(500)
      .json(errorBody('UNAUTHENTICATED', 'Pricing review access is not configured.', correlationId));
    return null;
  }

  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    recordCounter(METRIC.authRejected, 1, { code: 'UNAUTHENTICATED' });
    logStructured('warn', 'pricing_review.unauthenticated', {
      correlationId,
      tenantId,
      reason: 'missing_bearer_token',
    });
    res
      .status(401)
      .json(errorBody('UNAUTHENTICATED', 'Sign in to review pricing.', correlationId));
    return null;
  }

  let user: VerifiedUser;
  try {
    user = await verifyFirebaseToken(token);
  } catch {
    recordCounter(METRIC.authRejected, 1, { code: 'UNAUTHENTICATED' });
    logStructured('warn', 'pricing_review.unauthenticated', {
      correlationId,
      tenantId,
      reason: 'invalid_token',
    });
    res
      .status(401)
      .json(errorBody('UNAUTHENTICATED', 'Sign in again to review pricing.', correlationId));
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
    recordCounter(METRIC.authRejected, 1, { code: resolved.code });
    logStructured('warn', 'pricing_review.forbidden_tenant', {
      correlationId,
      tenantId,
      actorUid: user.uid,
      code: resolved.code,
    });
    res
      .status(STATUS_BY_AUTH_CODE[resolved.code] ?? 403)
      .json(errorBody('FORBIDDEN_ROLE', resolved.message, correlationId));
    return null;
  }

  return { uid: resolved.actor.uid, role: resolved.actor.role };
};

export function registerPricingReviewRoutes(
  app: Express,
  options: RegisterPricingReviewRoutesOptions
): void {
  const { db, fieldValue } = options;

  app.get('/api/v1/tenants/:tenantId/pricing-reviews', async (req: Request, res: Response) => {
    const correlationId = resolveCorrelationId(req.headers['x-correlation-id']);
    const { tenantId } = req.params;

    const actor = await authenticate(req, res, options, tenantId, correlationId);
    if (!actor) return;

    try {
      const reviews = await listPendingPricingReviews({ db, tenantId });
      return res.status(200).json({ success: true, reviews, correlationId });
    } catch (error: unknown) {
      logStructured('error', 'pricing_review.list_failed', {
        correlationId,
        tenantId,
        actorUid: actor.uid,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return res
        .status(500)
        .json(
          errorBody(
            'INTERNAL_ERROR',
            'Could not load pricing reviews. Try again.',
            correlationId
          )
        );
    }
  });

  app.post(
    '/api/v1/tenants/:tenantId/pricing-reviews/:eventId',
    async (req: Request, res: Response) => {
      const correlationId = resolveCorrelationId(req.headers['x-correlation-id']);
      const { tenantId, eventId } = req.params;
      const body = (req.body ?? {}) as Record<string, unknown>;

      const actor = await authenticate(req, res, options, tenantId, correlationId);
      if (!actor) return;

      const supervisorGrantToken = typeof body.supervisorGrantToken === 'string' ? body.supervisorGrantToken : undefined;
      if (!supervisorGrantToken) {
        recordCounter(METRIC.authRejected, 1, { code: 'SUPERVISOR_GRANT_REQUIRED' });
        logStructured('warn', 'pricing_review.supervisor_grant_required', {
          correlationId,
          tenantId,
          eventId,
          actorUid: actor.uid,
        });
        return res.status(401).json(
          errorBody('UNAUTHENTICATED', 'A valid supervisor grant is required to resolve a pricing review.', correlationId)
        );
      }

      const resolution = await resolvePricingReview({
        db,
        fieldValue,
        tenantId,
        eventId,
        decision: body.decision as PricingReviewDecision,
        reason: body.reason,
        actor: { uid: actor.uid, role: actor.role },
        correlationId,
        supervisorGrantToken,
      });

      // Narrowed with `in` rather than `!resolution.ok`: this project compiles
      // without `strictNullChecks`, where a boolean discriminant does not narrow.
      if ('code' in resolution) {
        return res
          .status(STATUS_BY_CODE[resolution.code] ?? 400)
          .json(errorBody(resolution.code, resolution.message, correlationId));
      }

      // 200 for both a fresh decision and a repeat: the repeat is a successful
      // read of an already-decided review, and `outcome` tells them apart.
      return res.status(200).json({
        success: true,
        outcome: resolution.outcome,
        review: resolution,
        correlationId,
      });
    }
  );
}