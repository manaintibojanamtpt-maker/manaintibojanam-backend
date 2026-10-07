/**
 * Durable rate limiting backed by Firestore, for limits that must hold across
 * process instances and restarts.
 *
 * Why this exists rather than the in-memory map it replaces
 * ----------------------------------------------------------
 * A per-process counter enforces the limit on exactly one machine. Behind a load
 * balancer, or after a restart, the count starts again from zero — so the actual
 * ceiling is `max × instances`, and an attacker who can make the process recycle
 * is not limited at all. For a brute-forceable secret like a supervisor code that
 * is the whole defence, so it cannot be process-local.
 *
 * Why a transaction
 * -----------------
 * `createDistributedRateLimiter` in `subscriptionRateLimiting.ts` reads the
 * counter, compares, then writes. Two concurrent requests both read `4`, both see
 * `4 < 5`, and both write `5` — one attempt is admitted for free. A read-modify-
 * write has to be inside a transaction for the increment to be atomic, so this
 * module does the whole read/compare/increment in one `runTransaction`.
 *
 * That existing helper also **fails open**, which is the right default for
 * protecting a database from accidental bursts and the wrong default here: with
 * the limiter unavailable, failing open means unlimited attempts against the
 * secret. See `onUnavailable` below.
 */

import type { Firestore, FieldValue } from 'firebase-admin/firestore';

/** Collection holding window counters. One document per scope per window. */
export const RATE_LIMIT_COLLECTION = 'rate_limit_counters';

export type RateLimitScope = string;

export interface DurableRateLimitOptions {
  db: Firestore;
  fieldValue: typeof FieldValue;
  /** Maximum attempts allowed within the window. */
  max: number;
  windowMs: number;
  /**
   * Namespaces the counter. Two features with the same `max` and window must not
   * share a document, or they would consume one another's budget.
   */
  namespace: string;
  /**
   * The scope the limit applies to — a tenant for supervisor verification, a user
   * for a per-account limit. Isolation between scopes is the point: a lockout must
   * not be triggerable for one tenant by another.
   */
  scope: RateLimitScope;
  now?: number;
}

export type DurableRateLimitDecision =
  | {
      allowed: true;
      /** Attempts consumed, including this one. */
      count: number;
      remaining: number;
      limit: number;
      /** Epoch ms when the current window ends. */
      resetAt: number;
    }
  | {
      allowed: false;
      count: number;
      remaining: 0;
      limit: number;
      resetAt: number;
      /** Milliseconds until the window rolls over. */
      retryAfterMs: number;
    };

export class RateLimiterUnavailableError extends Error {
  constructor(readonly cause?: unknown) {
    super('Rate limiter storage is unavailable.');
    this.name = 'RateLimiterUnavailableError';
  }
}

/**
 * Document id for a scope's current window.
 *
 * The window index is part of the id rather than a field, so a new window writes
 * a new document and the previous one becomes garbage that Firestore TTL can
 * collect. Writing `count` into a single rolling document instead would require
 * knowing the window start on every read, and would leave one document per scope
 * forever.
 */
const counterDocId = (namespace: string, scope: string, windowStart: number): string =>
  `${namespace}__${scope}__${windowStart}`;

/**
 * Consume one attempt, atomically, and report whether it is within the limit.
 *
 * Always increments, including when the limit is already exhausted. A limiter
 * that stops counting once it says "no" lets an attacker distinguish "locked out"
 * from "counter reset" and, worse, leaves the count stale for whoever arrives
 * after the window rolls over.
 *
 * Throws `RateLimiterUnavailableError` when the transaction cannot complete. The
 * caller decides what that means; for a secret-guarding limit it must fail closed.
 */
export const consumeRateLimit = async (
  options: DurableRateLimitOptions
): Promise<DurableRateLimitDecision> => {
  const { db, fieldValue, max, windowMs, namespace, scope } = options;
  const now = options.now ?? Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;

  const ref = db.collection(RATE_LIMIT_COLLECTION).doc(counterDocId(namespace, scope, windowStart));

  try {
    return await db.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;

      /**
       * A counter from an earlier window means the window rolled over. It is
       * treated as a fresh start rather than resumed, so a stale document can
       * never keep a tenant locked out indefinitely.
       */
      const storedWindow = Number(data?.windowStart ?? 0);
      const count =
        data && storedWindow === windowStart ? Math.max(0, Number(data.count ?? 0) || 0) : 0;

      const next = count + 1;

      transaction.set(
        ref,
        {
          namespace,
          scope,
          windowStart,
          count: next,
          limit: max,
          resetAt,
          // TTL buffer: the document must outlive its window by long enough for
          // any in-flight read to finish.
          expiresAt: resetAt + windowMs,
          updatedAt: fieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (next > max) {
        return {
          allowed: false as const,
          count: next,
          remaining: 0,
          limit: max,
          resetAt,
          retryAfterMs: Math.max(0, resetAt - now),
        };
      }

      return {
        allowed: true as const,
        count: next,
        remaining: Math.max(0, max - next),
        limit: max,
        resetAt,
      };
    });
  } catch (error) {
    throw new RateLimiterUnavailableError(error);
  }
};

/**
 * Read the current count without consuming an attempt.
 *
 * Used for diagnostics and for tests that need to assert a lockout state without
 * spending budget. Never use this to make an authorization decision — it is a
 * separate read and can race with a concurrent consume.
 */
export const peekRateLimit = async (
  options: Pick<DurableRateLimitOptions, 'db' | 'max' | 'windowMs' | 'namespace' | 'scope'> & {
    now?: number;
  }
): Promise<{ count: number; remaining: number; resetAt: number }> => {
  const now = options.now ?? Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const resetAt = windowStart + options.windowMs;
  const ref = options.db
    .collection(RATE_LIMIT_COLLECTION)
    .doc(counterDocId(options.namespace, options.scope, windowStart));

  const snap = await ref.get();
  const data = (snap.exists ? snap.data() : undefined) as Record<string, unknown> | undefined;
  const storedWindow = Number(data?.windowStart ?? 0);
  const count =
    data && storedWindow === windowStart ? Math.max(0, Number(data.count ?? 0) || 0) : 0;

  return { count, remaining: Math.max(0, options.max - count), resetAt };
};

/**
 * Forget an attempt, on a verified success.
 *
 * This is what makes the limit count *failures* rather than *requests*: an
 * operator who fumbles twice and then enters the right code is not left one
 * attempt from a lockout. It is a delete rather than a decrement because the
 * counter is the only thing standing between an attacker and the secret, and a
 * decrement that raced a concurrent consume could over-credit the budget.
 */
export const resetRateLimit = async (
  options: Pick<DurableRateLimitOptions, 'db' | 'windowMs' | 'namespace' | 'scope'> & {
    now?: number;
  }
): Promise<void> => {
  const now = options.now ?? Date.now();
  const windowStart = Math.floor(now / options.windowMs) * options.windowMs;
  const ref = options.db
    .collection(RATE_LIMIT_COLLECTION)
    .doc(counterDocId(options.namespace, options.scope, windowStart));
  try {
    await ref.delete();
  } catch {
    /**
     * Best effort. A stale counter only means the tenant waits out the window on
     * the next success, which is the safe direction to fail in.
     */
  }
};

/**
 * Delete counters whose window has closed.
 *
 * Exposed for the existing periodic cleanup path in `server.ts` so window
 * documents do not accumulate. Firestore TTL would eventually collect them, but a
 * named job keeps the collection bounded on projects without TTL enabled.
 */
export const cleanupRateLimitCounters = async (
  db: Firestore,
  now = Date.now(),
  limit = 500
): Promise<number> => {
  const snapshot = await db
    .collection(RATE_LIMIT_COLLECTION)
    .where('resetAt', '<=', now)
    .limit(limit)
    .get();
  if (snapshot.empty) return 0;
  const batch = db.batch();
  for (const doc of snapshot.docs) batch.delete(doc.ref);
  await batch.commit();
  return snapshot.size;
};
