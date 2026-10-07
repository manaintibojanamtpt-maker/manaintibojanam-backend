/**
 * Unverified-pricing review: the authorized end of the hold the `order.placed`
 * intake handler applies.
 *
 * Why this exists
 * ---------------
 * `CreateOrder` always creates the order. When the tenant's published menu could
 * not price one or more lines the order is written with
 * `pricingSource: 'client_unverified'` and the bill rests on the terminal's
 * cached price. That order is real and its payment is untouched, but it must not
 * quietly reach the kitchen: the intake handler records
 * `requiresPricingReview: true` / `holdsFulfillment: true` in `order_intake`.
 *
 * Recording the flag is only half a policy. Somebody must be able to decide, and
 * the decision must be attributable. This service is that decision, and it is
 * deliberately narrow:
 *
 *  - Only an owner or manager of *that* tenant may resolve a review. Cashier and
 *    kitchen roles cannot clear their own pricing hold.
 *  - The decision is written once. A second attempt reports the existing
 *    decision instead of overwriting it, so two managers racing on the same
 *    review cannot produce two contradicting audit records.
 *  - A reason is mandatory. An approval with no recorded justification is not an
 *    approval, it is an unexplained price change.
 *  - Approval releases the fulfillment hold and stamps the order as verified.
 *    Rejection keeps the hold and marks the order `REJECTED`, so the customer is
 *    not served a bill the tenant refused to stand behind.
 *
 * Reconciliation is not in scope here: nothing in this module moves money or
 * rewrites a payment. Payments and the discrepancies they raise keep flowing
 * through their own settlement path.
 */

import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { ORDER_INTAKE_COLLECTION } from './orderOutboxHandlers';
import { logStructured, recordCounter, METRIC } from './orderObservability';
import type { CommandActorRole } from './orderCommandContract';
import { consumeSupervisorGrant, grantTokenDocId, SUPERVISOR_GRANT_COLLECTION } from './supervisorVerification';

/** Collections this module writes. `audit_logs` is the existing audit trail. */
export const PRICING_REVIEW_AUDIT_COLLECTION = 'audit_logs';

export type PricingReviewDecision = 'APPROVE' | 'REJECT';

export type PricingReviewErrorCode =
  | 'INVALID_DECISION'
  | 'REASON_REQUIRED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'NOT_FOUND'
  | 'TENANT_MISMATCH'
  | 'ALREADY_RESOLVED'
  | 'NOT_REQUIRED'
  | 'GRANT_INVALID'
  | 'GRANT_EXPIRED'
  | 'GRANT_CONSUMED'
  | 'GRANT_MISMATCH';

export interface PricingReviewActor {
  uid: string;
  role: CommandActorRole | string;
  email?: string;
}

export interface ResolvePricingReviewInput {
  db: Firestore;
  fieldValue: typeof FieldValue;
  tenantId: string;
  /** `order_intake` document id, which is the `order.placed` event id. */
  eventId: string;
  decision: unknown;
  reason: unknown;
  actor: PricingReviewActor;
  correlationId: string;
  /** Supervisor grant token for `RESOLVE_PRICING_REVIEW` operation. */
  supervisorGrantToken?: string;
}

export type PricingReviewResolution =
  | {
      ok: true;
      /** `resolved` when this call decided it, `already_resolved` on a repeat. */
      outcome: 'resolved' | 'already_resolved';
      eventId: string;
      orderId: string;
      decision: PricingReviewDecision;
      resolvedAt: string;
      resolvedBy: string;
      reason: string;
    }
  | { ok: false; code: PricingReviewErrorCode; message: string };

/** Roles allowed to clear or reject a pricing hold. */
const REVIEW_ROLES: ReadonlySet<string> = new Set(['owner', 'manager', 'admin']);

const MIN_REASON_LENGTH = 8;

export const isRoleAllowedToResolvePricingReview = (role: unknown): boolean =>
  REVIEW_ROLES.has(String(role ?? '').trim().toLowerCase());

const normalizeDecision = (value: unknown): PricingReviewDecision | null => {
  const decision = String(value ?? '').trim().toUpperCase();
  return decision === 'APPROVE' || decision === 'REJECT' ? decision : null;
};

const fail = (
  code: PricingReviewErrorCode,
  message: string,
  correlationId: string,
  input: { tenantId: string; eventId: string; actor: PricingReviewActor }
): PricingReviewResolution & { ok: false } => {
  recordCounter(METRIC.authRejected, 1, { code });
  logStructured('warn', 'pricing_review.rejected', {
    correlationId,
    tenantId: input.tenantId,
    eventId: input.eventId,
    actorUid: input.actor.uid,
    actorRole: input.actor.role,
    code,
  });
  return { ok: false, code, message };
};

/**
 * Resolve one unverified-pricing review.
 *
 * The intake document and the audit record are written in one transaction, so a
 * decision is never recorded without its audit entry and an audit entry is never
 * recorded for a decision that did not apply.
 *
 * Requires a valid supervisor grant for RESOLVE_PRICING_REVIEW operation.
 */
export const resolvePricingReview = async (
  input: ResolvePricingReviewInput
): Promise<PricingReviewResolution> => {
  const { db, fieldValue, tenantId, eventId, actor, correlationId, supervisorGrantToken } = input;

  const decision = normalizeDecision(input.decision);
  if (!decision) {
    return fail(
      'INVALID_DECISION',
      "decision must be 'APPROVE' or 'REJECT'.",
      correlationId,
      { tenantId, eventId, actor }
    );
  }

  const reason = String(input.reason ?? '').trim();
  if (reason.length < MIN_REASON_LENGTH) {
    return fail(
      'REASON_REQUIRED',
      `A reason of at least ${MIN_REASON_LENGTH} characters is required so the decision stays attributable.`,
      correlationId,
      { tenantId, eventId, actor }
    );
  }

  if (!actor.uid) {
    return fail(
      'UNAUTHENTICATED',
      'A verified actor is required to resolve a pricing review.',
      correlationId,
      { tenantId, eventId, actor }
    );
  }

  if (!isRoleAllowedToResolvePricingReview(actor.role)) {
    return fail(
      'FORBIDDEN_ROLE',
      `Role '${String(actor.role)}' may not resolve a pricing review. An owner or manager must decide.`,
      correlationId,
      { tenantId, eventId, actor }
    );
  }

  // Preliminary read to check if the review is already resolved.
  // If already resolved, return the existing decision without requiring a grant.
  const intakeRef = db.collection(ORDER_INTAKE_COLLECTION).doc(eventId);
  const intakeSnap = await intakeRef.get();
  const intake = (intakeSnap.exists ? intakeSnap.data() : undefined) as
    | Record<string, unknown>
    | undefined;

  if (!intake) {
    return fail('NOT_FOUND', 'No pricing review exists for that order.', correlationId, {
      tenantId,
      eventId,
      actor,
    });
  }

  // Defence in depth: the document id is tenant-scoped, but the stored tenant
  // is what the rest of the system reads, so it is checked rather than assumed.
  if (String(intake.tenantId ?? '') !== tenantId) {
    return fail('TENANT_MISMATCH', 'That pricing review belongs to another tenant.', correlationId, {
      tenantId,
      eventId,
      actor,
    });
  }

  const existing = intake.resolution as Record<string, unknown> | undefined;
  if (existing && typeof existing === 'object') {
    // A repeat call is answered, not re-applied: the first decision stands and
    // no second audit record is produced for it. No grant is required for a repeat read.
    return {
      ok: true,
      outcome: 'already_resolved',
      eventId,
      orderId: String(intake.orderId ?? ''),
      decision: normalizeDecision(existing.decision) ?? decision,
      resolvedAt: String(existing.resolvedAt ?? new Date().toISOString()),
      resolvedBy: String(existing.resolvedBy ?? actor.uid),
      reason: String(existing.reason ?? String(input.reason ?? '')),
    };
  }

  if (intake.requiresPricingReview !== true) {
    return fail(
      'NOT_REQUIRED',
      'That order was not flagged for a pricing review.',
      correlationId,
      { tenantId, eventId, actor }
    );
  }

  // The review is not yet resolved. Validate and consume the supervisor grant
  // inside the same transaction as the resolution write so a transient failure
  // after grant consumption does not waste the approval.
  if (!supervisorGrantToken || typeof supervisorGrantToken !== 'string') {
    return fail(
      'UNAUTHENTICATED',
      'A valid supervisor grant is required to resolve a pricing review.',
      correlationId,
      { tenantId, eventId, actor }
    );
  }

  const nowIso = new Date().toISOString();

  try {
    return await db.runTransaction(async (transaction) => {
      const intakeRef = db.collection(ORDER_INTAKE_COLLECTION).doc(eventId);
      const intakeSnap = await transaction.get(intakeRef);
      const intake = (intakeSnap.exists ? intakeSnap.data() : undefined) as
        | Record<string, unknown>
        | undefined;

      if (!intake) {
        return fail('NOT_FOUND', 'No pricing review exists for that order.', correlationId, {
          tenantId,
          eventId,
          actor,
        });
      }

      if (String(intake.tenantId ?? '') !== tenantId) {
        return fail('TENANT_MISMATCH', 'That pricing review belongs to another tenant.', correlationId, {
          tenantId,
          eventId,
          actor,
        });
      }

      const existing = intake.resolution as Record<string, unknown> | undefined;
      if (existing && typeof existing === 'object') {
        return {
          ok: true,
          outcome: 'already_resolved',
          eventId,
          orderId: String(intake.orderId ?? ''),
          decision: normalizeDecision(existing.decision) ?? decision,
          resolvedAt: String(existing.resolvedAt ?? nowIso),
          resolvedBy: String(existing.resolvedBy ?? actor.uid),
          reason: String(existing.reason ?? reason),
        };
      }

      if (intake.requiresPricingReview !== true) {
        return fail(
          'NOT_REQUIRED',
          'That order was not flagged for a pricing review.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }

      const orderId = String(intake.orderId ?? '');
      if (!orderId) {
        return fail('NOT_FOUND', 'That pricing review has no order.', correlationId, {
          tenantId,
          eventId,
          actor,
        });
      }

      const grantRef = db.collection(SUPERVISOR_GRANT_COLLECTION).doc(grantTokenDocId(supervisorGrantToken));
      const grantSnap = await transaction.get(grantRef);

      if (!grantSnap.exists) {
        return fail(
          'GRANT_INVALID',
          'That supervisor approval is not valid.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }

      const grantData = (grantSnap.data() ?? {}) as Record<string, unknown>;
      const now = Date.now();

      if (grantData.consumedAt !== null && grantData.consumedAt !== undefined) {
        return fail(
          'GRANT_CONSUMED',
          'That supervisor approval has already been used.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }
      if (Number(grantData.expiresAt ?? 0) <= now) {
        return fail(
          'GRANT_EXPIRED',
          'That supervisor approval has expired.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }
      if (String(grantData.actorUid ?? '') !== actor.uid) {
        return fail(
          'GRANT_MISMATCH',
          'That supervisor approval was issued to another user.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }
      if (String(grantData.tenantId ?? '') !== tenantId) {
        return fail(
          'GRANT_MISMATCH',
          'That supervisor approval is for another tenant.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }
      if (String(grantData.operation ?? '') !== 'RESOLVE_PRICING_REVIEW') {
        return fail(
          'GRANT_MISMATCH',
          'That supervisor approval is not for pricing reviews.',
          correlationId,
          { tenantId, eventId, actor }
        );
      }

      transaction.update(grantRef, {
        consumedAt: fieldValue.serverTimestamp(),
        consumedBy: actor.uid,
      });

      const holdsFulfillment = decision === 'REJECT';

      transaction.update(intakeRef, {
        requiresPricingReview: false,
        holdsFulfillment,
        resolution: {
          decision,
          reason,
          resolvedAt: nowIso,
          resolvedBy: actor.uid,
          resolvedByRole: actor.role,
          correlationId,
        },
        resolvedAt: nowIso,
        resolvedBy: actor.uid,
      });

      const orderRef = db.collection('orders').doc(orderId);
      transaction.update(orderRef, {
        pricingVerifiedAt: decision === 'APPROVE' ? nowIso : null,
        pricingOverride: {
          decision,
          reason,
          actorUid: actor.uid,
          actorRole: actor.role,
          at: nowIso,
        },
        ...(decision === 'REJECT'
          ? {
              orderStatus: 'REJECTED',
              status: 'REJECTED',
              pricingRejectedAt: nowIso,
            }
          : { pricingVerifiedBy: actor.uid }),
      });

      transaction.set(
        db.collection(PRICING_REVIEW_AUDIT_COLLECTION).doc(`${eventId}__${decision}`),
        {
          tenantId,
          restaurantId: tenantId,
          eventId,
          orderId,
          action: `order.pricing_review.${decision.toLowerCase()}`,
          decision,
          reason,
          pricingSource: intake.pricingSource ?? null,
          unverifiedTotal: intake.total ?? null,
          actorUid: actor.uid,
          actorRole: actor.role,
          ...(actor.email ? { actorEmail: actor.email } : {}),
          correlationId,
          occurredAt: nowIso,
          createdAt: fieldValue.serverTimestamp(),
        }
      );

      logStructured('info', 'pricing_review.resolved', {
        correlationId,
        tenantId,
        eventId,
        orderId,
        decision,
        actorUid: actor.uid,
        actorRole: actor.role,
      });

      return {
        ok: true,
        outcome: 'resolved',
        eventId,
        orderId,
        decision,
        resolvedAt: nowIso,
        resolvedBy: actor.uid,
        reason,
      };
    });
  } catch (error: unknown) {
    logStructured('error', 'pricing_review.transaction_failed', {
      correlationId,
      tenantId,
      eventId,
      actorUid: actor.uid,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export interface ListPricingReviewsOptions {
  db: Firestore;
  tenantId: string;
  limit?: number;
}

export interface PricingReviewSummary {
  eventId: string;
  orderId: string;
  pricingSource: string;
  total: number;
  occurredAt: string | null;
  deliveredAt: string | null;
  decision: PricingReviewDecision | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  reason: string | null;
}

/**
 * List a tenant's unresolved pricing reviews, oldest first.
 *
 * Scoped to the tenant in the path and filtered on `requiresPricingReview`, so
 * one tenant can never see another's queue and resolved reviews drop off the
 * working list.
 */
export const listPendingPricingReviews = async (
  options: ListPricingReviewsOptions
): Promise<PricingReviewSummary[]> => {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const snapshot = await options.db
    .collection(ORDER_INTAKE_COLLECTION)
    .where('tenantId', '==', options.tenantId)
    .where('requiresPricingReview', '==', true)
    .limit(limit)
    .get();

  return snapshot.docs.map((docSnap) => {
    const data = (docSnap.data() ?? {}) as Record<string, unknown>;
    const resolution = data.resolution as Record<string, unknown> | undefined;
    return {
      eventId: docSnap.id,
      orderId: String(data.orderId ?? ''),
      pricingSource: String(data.pricingSource ?? 'unknown'),
      total: Number(data.total ?? 0) || 0,
      occurredAt: data.occurredAt ? String(data.occurredAt) : null,
      deliveredAt: data.deliveredAt instanceof Date ? data.deliveredAt.toISOString() : null,
      decision: normalizeDecision(resolution?.decision) ?? null,
      resolvedAt: resolution?.resolvedAt ? String(resolution.resolvedAt) : null,
      resolvedBy: resolution?.resolvedBy ? String(resolution.resolvedBy) : null,
      reason: resolution?.reason ? String(resolution.reason) : null,
    };
  });
};