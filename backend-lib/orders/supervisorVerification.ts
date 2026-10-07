/**
 * Supervisor verification for sensitive POS actions.
 *
 * What this replaces
 * ------------------
 * The POS used to send a staff-entered PIN to an endpoint that did not exist,
 * and the client compared nothing locally. The failure mode was silent: any
 * response the fetch did not reject was treated as "verified", so an offline or
 * 404 endpoint simply left the action unlocked. This module makes the server the
 * only authority and makes every refusal observable.
 *
 * The design decisions worth stating
 *
 * Credential storage. A PIN is never stored in plaintext and never leaves the
 * server in a form that can be logged. Credentials live in
 * `supervisor_credentials`, hashed with scrypt and compared with a constant-time
 * comparison. A tenant with no credential configured has no supervisor: the
 * verification fails closed rather than accepting a default.
 *
 * No client-supplied authority. The request body carries only a code and an
 * operation. Who the caller is comes from a verified Firebase ID token and the
 * caller's tenant membership; a body field claiming a role is ignored, not
 * honoured. This is what stops a terminal from escalating itself.
 *
 * Bound, short-lived grants. A successful verification returns a grant, not a
 * boolean. The grant names the actor, the tenant, the operation it was issued
 * for, and an expiry. It is stored server-side and consumed once, so a grant
 * captured from one terminal cannot be replayed against a different tenant, a
 * different operation, or the same operation twice. The client cannot extend it
 * and cannot mint one.
 *
 * Audit. Every attempt — granted or refused — writes an audit record with the
 * actor, tenant, operation, outcome and reason. Refusals are recorded because
 * they are the interesting ones. The credential is never part of a record or a
 * log line.
 */

import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Firestore, FieldValue } from 'firebase-admin/firestore';
import { logStructured } from './orderObservability';
import {
  consumeRateLimit,
  peekRateLimit,
  resetRateLimit,
  RateLimiterUnavailableError,
  type DurableRateLimitDecision,
} from '../shared/durableRateLimit';

/** Collection holding hashed supervisor credentials, one document per tenant. */
export const SUPERVISOR_CREDENTIAL_COLLECTION = 'supervisor_credentials';

/** Collection holding issued, unconsumed grants. */
export const SUPERVISOR_GRANT_COLLECTION = 'supervisor_grants';

/**
 * Attempts used so far in the current window, without consuming another.
 *
 * A convenience for diagnostics and tests. Because it is a separate read it can
 * race with a concurrent consume, so it must never gate an authorization
 * decision — `consumeRateLimit` is the only thing that decides.
 */
export const supervisorAttemptStatus = (
  db: Firestore,
  tenantId: string,
  now?: number
): Promise<{ count: number; remaining: number; resetAt: number }> =>
  peekRateLimit({
    db,
    namespace: SUPERVISOR_RATE_LIMIT_NAMESPACE,
    scope: tenantId,
    max: SUPERVISOR_MAX_ATTEMPTS,
    windowMs: SUPERVISOR_ATTEMPT_WINDOW_MS,
    ...(now !== undefined ? { now } : {}),
  });

/** True when the tenant is currently locked out. Diagnostics only. */
export const isSupervisorLockedOut = async (
  db: Firestore,
  tenantId: string,
  now?: number
): Promise<boolean> => {
  const status = await supervisorAttemptStatus(db, tenantId, now);
  return status.count >= SUPERVISOR_MAX_ATTEMPTS;
};

/** Audit trail for verification attempts. Shared with the pricing review trail. */
export const SUPERVISOR_AUDIT_COLLECTION = 'audit_logs';

/**
 * Operations a grant may be issued for.
 *
 * An allowlist, not a free string: a grant for one operation must not authorize
 * another, so the operation has to be one this server recognises.
 */
export const SUPERVISOR_OPERATIONS = ['REOPEN_BUSINESS_DAY', 'RESOLVE_PRICING_REVIEW'] as const;
export type SupervisorOperation = (typeof SUPERVISOR_OPERATIONS)[number];

/**
 * Grant lifetime. Short by design — long enough to complete one approval at the
 * counter, far too short to be captured and reused later.
 */
export const SUPERVISOR_GRANT_TTL_MS = 5 * 60 * 1000;

/** Attempts allowed per tenant per window before verification is refused. */
export const SUPERVISOR_MAX_ATTEMPTS = 5;
export const SUPERVISOR_ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

/**
 * Namespaces the durable counter so it cannot share a budget with any other
 * limiter that happens to use the same tenant-scoped key.
 */
export const SUPERVISOR_RATE_LIMIT_NAMESPACE = 'supervisor_verify';

export type SupervisorVerificationFailure =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_TENANT'
  | 'INVALID_OPERATION'
  | 'NO_CREDENTIAL_CONFIGURED'
  | 'INVALID_CODE'
  | 'RATE_LIMITED'
  | 'CREDENTIAL_MISMATCH';

export interface SupervisorAttemptRecord {
  tenantId: string;
  actorUid: string;
  actorRole: string;
  operation: string;
  outcome: 'granted' | 'refused';
  reason?: string;
  correlationId: string;
  at: string;
}

export interface SupervisorGrant {
  token: string;
  tenantId: string;
  actorUid: string;
  operation: SupervisorOperation;
  /** Epoch ms. */
  expiresAt: number;
}

export type SupervisorVerificationResult =
  | { ok: true; grant: SupervisorGrant; attempt: SupervisorAttemptRecord }
  | {
      ok: false;
      code: SupervisorVerificationFailure;
      message: string;
      attempt?: SupervisorAttemptRecord;
      /** Present on a lockout so the caller can be told exactly how long to wait. */
      retryAfterMs?: number;
    };

export interface VerifySupervisorOptions {
  db: Firestore;
  fieldValue: typeof FieldValue;
  tenantId: string;
  operation: unknown;
  /** The staff-entered code. Compared server-side; never stored or logged. */
  code: unknown;
  actorUid: string;
  actorRole: string;
  correlationId: string;
  now?: number;
  /**
   * Behaviour when the durable counter cannot be reached. Defaults to `closed`,
   * which refuses the attempt — see `RateLimiterFailureMode`.
   */
  rateLimiterFailureMode?: RateLimiterFailureMode;
}

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

/**
 * Counters live in Firestore, not in this process.
 *
 * They used to be a module-level `Map`. That enforced the limit on exactly one
 * machine: behind a load balancer the real ceiling was `max × instances`, and a
 * restart reset it to zero. For a brute-forceable secret that is not a limit at
 * all, so the counter is now a transactional document shared by every instance.
 *
 * See `durableRateLimit.ts` for why the increment has to happen inside the
 * transaction, and for the availability decision below.
 */

export interface RateLimitState {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * What to do when the limiter cannot be reached.
 *
 * `closed` (the default) refuses the attempt. For this feature that is the only
 * safe answer: an unavailable limiter means unlimited attempts against a short
 * secret, and the code is compared with a deliberately expensive hash, which is
 * the protection being given up. Failing open here would mean the deployment's
 * availability matters more than its supervisor credentials — the wrong trade.
 *
 * `open` is offered for completeness and is not used by supervisor verification.
 */
export type RateLimiterFailureMode = 'closed' | 'open';

const consumeSupervisorAttempt = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  tenantId: string,
  now: number,
  failureMode: RateLimiterFailureMode
): Promise<DurableRateLimitDecision> => {
  try {
    return await consumeRateLimit({
      db,
      fieldValue,
      namespace: SUPERVISOR_RATE_LIMIT_NAMESPACE,
      scope: tenantId,
      max: SUPERVISOR_MAX_ATTEMPTS,
      windowMs: SUPERVISOR_ATTEMPT_WINDOW_MS,
      now,
    });
  } catch (error: unknown) {
    logStructured('error', 'supervisor.rate_limiter_unavailable', {
      tenantId,
      failureMode,
      error: error instanceof Error ? error.message : 'Unknown error',
      isRateLimiterError: error instanceof RateLimiterUnavailableError,
    });
    if (failureMode === 'open') {
      // Admit without recording. Stated plainly in the log so it is never mistaken
      // for a limiter that actually worked.
      return {
        allowed: true,
        count: 0,
        remaining: SUPERVISOR_MAX_ATTEMPTS,
        limit: SUPERVISOR_MAX_ATTEMPTS,
        resetAt: now + SUPERVISOR_ATTEMPT_WINDOW_MS,
      };
    }
    return {
      allowed: false,
      count: SUPERVISOR_MAX_ATTEMPTS + 1,
      remaining: 0,
      limit: SUPERVISOR_MAX_ATTEMPTS,
      resetAt: now + SUPERVISOR_ATTEMPT_WINDOW_MS,
      retryAfterMs: SUPERVISOR_ATTEMPT_WINDOW_MS,
    };
  }
};

const clearSupervisorAttempts = async (
  db: Firestore,
  tenantId: string,
  now: number
): Promise<void> => {
  await resetRateLimit({
    db,
    namespace: SUPERVISOR_RATE_LIMIT_NAMESPACE,
    scope: tenantId,
    windowMs: SUPERVISOR_ATTEMPT_WINDOW_MS,
    now,
  });
};

// ---------------------------------------------------------------------------
// Credential hashing
// ---------------------------------------------------------------------------

/**
 * Hash a code for storage. scrypt with a per-credential salt, so two tenants
 * choosing the same PIN do not produce the same stored value and a stolen
 * collection cannot be attacked with one precomputed table.
 */
export const hashSupervisorCode = (code: string, salt: string): string =>
  scryptSync(code, salt, 32).toString('hex');

export const newCredentialSalt = (): string => randomBytes(16).toString('hex');

/**
 * Constant-time comparison of a candidate code against a stored hash.
 *
 * Lengths are compared first because `timingSafeEqual` throws on a length
 * mismatch, and the length of a digest is not a secret.
 */
export const verifyCodeAgainstHash = (code: string, salt: string, expectedHash: string): boolean => {
  if (typeof expectedHash !== 'string' || expectedHash.length === 0) return false;
  const candidate = Buffer.from(hashSupervisorCode(code, salt), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  if (candidate.length !== expected.length || expected.length === 0) return false;
  return timingSafeEqual(candidate, expected);
};

/** Non-reversible reference for correlating attempts without holding the code. */
export const fingerprintCode = (code: string, tenantId: string): string =>
  createHash('sha256').update(`${tenantId}:${code}`).digest('hex').slice(0, 12);

// ---------------------------------------------------------------------------
// Grant issue and consumption
// ---------------------------------------------------------------------------

const normalizeOperation = (value: unknown): SupervisorOperation | null => {
  const operation = String(value ?? '').trim().toUpperCase();
  return (SUPERVISOR_OPERATIONS as readonly string[]).includes(operation)
    ? (operation as SupervisorOperation)
    : null;
};

/**
 * Persist a grant. The document id is the token's own hash, so a grant document
 * cannot be enumerated by incrementing an id, and a leaked database does not
 * hand over usable tokens.
 */
const persistGrant = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  grant: SupervisorGrant,
  now: number
): Promise<void> => {
  await db
    .collection(SUPERVISOR_GRANT_COLLECTION)
    .doc(grantTokenDocId(grant.token))
    .set({
      tokenHash: hashGrantToken(grant.token),
      tenantId: grant.tenantId,
      actorUid: grant.actorUid,
      operation: grant.operation,
      issuedAt: now,
      expiresAt: grant.expiresAt,
      consumedAt: null,
      createdAt: fieldValue.serverTimestamp(),
    });
};

const hashGrantToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export const grantTokenDocId = (token: string): string => hashGrantToken(token);

export type ConsumeGrantResult =
  | { ok: true; grant: { tenantId: string; actorUid: string; operation: SupervisorOperation } }
  | { ok: false; code: 'GRANT_INVALID' | 'GRANT_EXPIRED' | 'GRANT_CONSUMED' | 'GRANT_MISMATCH' };

/**
 * Redeem a grant.
 *
 * Every binding is checked: the token must exist, be unconsumed, be unexpired,
 * belong to the redeeming actor, match the requested tenant, and cover the
 * requested operation. Consumption is a transactional compare-and-set, so two
 * callers redeeming the same grant concurrently cannot both succeed.
 */
export const consumeSupervisorGrant = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  input: {
    token: unknown;
    tenantId: string;
    operation: unknown;
    actorUid: string;
    now?: number;
  }
): Promise<ConsumeGrantResult> => {
  const token = String(input.token ?? '').trim();
  const operation = normalizeOperation(input.operation);
  const now = input.now ?? Date.now();

  if (!token || !operation) return { ok: false, code: 'GRANT_INVALID' };

  return db.runTransaction(async (transaction) => {
    const ref = db.collection(SUPERVISOR_GRANT_COLLECTION).doc(grantTokenDocId(token));
    const snap = await transaction.get(ref);
    if (!snap.exists) return { ok: false, code: 'GRANT_INVALID' };

    const data = (snap.data() ?? {}) as Record<string, unknown>;

    if (data.consumedAt !== null && data.consumedAt !== undefined) {
      return { ok: false, code: 'GRANT_CONSUMED' };
    }
    if (Number(data.expiresAt ?? 0) <= now) {
      return { ok: false, code: 'GRANT_EXPIRED' };
    }
    if (String(data.actorUid ?? '') !== input.actorUid) {
      return { ok: false, code: 'GRANT_MISMATCH' };
    }
    if (String(data.tenantId ?? '') !== input.tenantId) {
      return { ok: false, code: 'GRANT_MISMATCH' };
    }
    if (String(data.operation ?? '') !== operation) {
      return { ok: false, code: 'GRANT_MISMATCH' };
    }

    transaction.update(ref, {
      consumedAt: fieldValue.serverTimestamp(),
      consumedBy: input.actorUid,
    });

    return {
      ok: true,
      grant: {
        tenantId: String(data.tenantId),
        actorUid: String(data.actorUid),
        operation: String(data.operation) as SupervisorOperation,
      },
    };
  });
};

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

/**
 * Verify a staff-entered code and, on success, issue a bound grant.
 *
 * Failures are typed rather than thrown so the route can map them to statuses,
 * and every path writes an audit record — including the rate-limited one, which
 * is the attempt pattern worth investigating.
 */
export const verifySupervisorCredential = async (
  options: VerifySupervisorOptions
): Promise<SupervisorVerificationResult> => {
  const { db, fieldValue, tenantId, actorUid, actorRole, correlationId } = options;
  const now = options.now ?? Date.now();
  const at = new Date(now).toISOString();

  const audit = async (
    outcome: 'granted' | 'refused',
    reason: string,
    extras: Record<string, unknown> = {}
  ): Promise<SupervisorAttemptRecord> => {
    const attempt: SupervisorAttemptRecord = {
      tenantId,
      actorUid,
      actorRole,
      operation: String(options.operation ?? ''),
      outcome,
      reason,
      correlationId,
      at,
    };
    try {
      /**
       * An explicit id rather than `add()`: every attempt is its own document,
       * and a derived id makes an attempt findable by timestamp without a
       * collection scan. It carries no secret — the attempt is already recorded
       * and the code never reaches this layer.
       */
      const auditId = `${tenantId}__${attempt.operation || 'unknown'}__${now}__${randomUUID().slice(0, 8)}`;
      await db
        .collection(SUPERVISOR_AUDIT_COLLECTION)
        .doc(auditId)
        .set({
          tenantId,
          restaurantId: tenantId,
          action: 'pos.supervisor.verify',
          ...attempt,
          ...extras,
          createdAt: fieldValue.serverTimestamp(),
        });
    } catch (error: unknown) {
      // An audit write failure must not turn a refusal into a success, and must
      // not crash the request either. It is surfaced loudly instead.
      logStructured('error', 'supervisor.audit_write_failed', {
        correlationId,
        tenantId,
        actorUid,
        outcome,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return attempt;
  };

  if (!actorUid) {
    const attempt = await audit('refused', 'unauthenticated');
    return {
      ok: false,
      code: 'UNAUTHENTICATED',
      message: 'Sign in before requesting supervisor approval.',
      attempt,
    };
  }

  const operation = normalizeOperation(options.operation);
  if (!operation) {
    const attempt = await audit('refused', 'invalid_operation');
    return {
      ok: false,
      code: 'INVALID_OPERATION',
      message: `operation must be one of ${SUPERVISOR_OPERATIONS.join(', ')}.`,
      attempt,
    };
  }

  /**
   * The limit is consulted before the code is even inspected.
   *
   * Order matters: if a malformed code were rejected first, an attacker could
   * send unlimited short codes, never see a lockout, and never increment the
   * counter that protects the real one. Checking the limit first means every
   * attempt costs the tenant, and a caller who is locked out is told so instead
   * of being told their code was wrong.
   */
  const limit = await consumeSupervisorAttempt(
    db,
    fieldValue,
    tenantId,
    now,
    options.rateLimiterFailureMode ?? 'closed'
  );
  if (limit.allowed === false) {
    const attempt = await audit('refused', 'rate_limited', {
      retryAfterMs: limit.retryAfterMs,
      count: limit.count,
    });
    logStructured('warn', 'supervisor.rate_limited', {
      correlationId,
      tenantId,
      actorUid,
      operation,
      retryAfterMs: limit.retryAfterMs,
      count: limit.count,
    });
    return {
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Wait before trying the supervisor code again.',
      attempt,
      retryAfterMs: limit.retryAfterMs,
    };
  }

  const code = String(options.code ?? '').trim();
  // A length floor below this is not a real supervisor credential, and
  // rejecting it early keeps the hash work off trivially guessable inputs. The
  // attempt has already been counted above, so a malformed guess still costs the
  // tenant budget.
  if (code.length < 6 || code.length > 64) {
    const attempt = await audit('refused', 'invalid_code_length', {
      remainingAttempts: limit.remaining,
    });
    return {
      ok: false,
      code: 'INVALID_CODE',
      message: 'That code was not accepted.',
      attempt,
    };
  }

  const credentialRef = db.collection(SUPERVISOR_CREDENTIAL_COLLECTION).doc(tenantId);
  const credentialSnap = await credentialRef.get();
  const credential = (credentialSnap.exists ? credentialSnap.data() : undefined) as
    | Record<string, unknown>
    | undefined;

  if (!credential || typeof credential.codeHash !== 'string' || typeof credential.salt !== 'string') {
    // No configured supervisor: the action stays locked. Accepting a default here
    // would make every unconfigured tenant's approvals forgeable.
    const attempt = await audit('refused', 'no_credential_configured');
    return {
      ok: false,
      code: 'NO_CREDENTIAL_CONFIGURED',
      message: 'No supervisor credential is configured for this tenant.',
      attempt,
    };
  }

  if (credential.disabled === true) {
    const attempt = await audit('refused', 'credential_disabled');
    return {
      ok: false,
      code: 'CREDENTIAL_MISMATCH',
      message: 'The supervisor credential for this tenant is disabled.',
      attempt,
    };
  }

  const matches = verifyCodeAgainstHash(code, credential.salt, credential.codeHash);
  if (!matches) {
    const attempt = await audit('refused', 'invalid_code', {
      codeFingerprint: fingerprintCode(code, tenantId),
      remainingAttempts: limit.remaining,
    });
    logStructured('warn', 'supervisor.invalid_code', {
      correlationId,
      tenantId,
      actorUid,
      operation,
      // The fingerprint correlates attempts for one tenant without retaining
      // anything derived from the code that could be brute-forced offline.
      codeFingerprint: fingerprintCode(code, tenantId),
    });
    return {
      ok: false,
      code: 'INVALID_CODE',
      message: 'That code was not accepted.',
      attempt,
    };
  }

  const grant: SupervisorGrant = {
    token: randomUUID(),
    tenantId,
    actorUid,
    operation,
    expiresAt: now + SUPERVISOR_GRANT_TTL_MS,
  };
  await persistGrant(db, fieldValue, grant, now);

  // A successful verification clears the counter, so an operator who fumbles
  // twice and then gets it right is not left one attempt from a lockout. The
  // counter is shared, so this clears it for every instance.
  await clearSupervisorAttempts(db, tenantId, now);

  const attempt = await audit('granted', 'verified', {
    grantExpiresAt: new Date(grant.expiresAt).toISOString(),
  });
  logStructured('info', 'supervisor.granted', {
    correlationId,
    tenantId,
    actorUid,
    actorRole,
    operation,
    expiresAt: attempt.at,
  });

  return { ok: true, grant, attempt };
};

/**
 * Provision or replace a tenant's supervisor credential.
 *
 * Only the salted hash is stored, so this function is the only place that ever
 * sees the plaintext, and it does not return it either.
 */
export const setSupervisorCredential = async (
  db: Firestore,
  fieldValue: typeof FieldValue,
  input: { tenantId: string; code: string; actorUid: string; disabled?: boolean }
): Promise<{ ok: boolean; error?: string }> => {
  const code = String(input.code ?? '').trim();
  if (code.length < 6 || code.length > 64) {
    return { ok: false, error: 'code must be between 6 and 64 characters' };
  }
  if (!input.tenantId) return { ok: false, error: 'tenantId is required' };

  const salt = newCredentialSalt();
  await db
    .collection(SUPERVISOR_CREDENTIAL_COLLECTION)
    .doc(input.tenantId)
    .set(
      {
        tenantId: input.tenantId,
        salt,
        codeHash: hashSupervisorCode(code, salt),
        updatedBy: input.actorUid,
        disabled: input.disabled === true,
        createdAt: fieldValue.serverTimestamp(),
        updatedAt: fieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  return { ok: true };
};