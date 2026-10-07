/**
 * The supervisor attempt limit, where the security property actually lives.
 *
 * The previous implementation kept counters in a module-level `Map`. These tests
 * exist because that passed every behavioural test it had: with one process, an
 * in-memory counter *is* the limit. The failures only appear with more than one
 * instance or a restart, so each property below is stated in terms that a
 * single-process counter cannot satisfy.
 */

import { it, describe } from 'node:test';
import assert from 'node:assert/strict';

import { createFakeFirestore, mockFieldValue, type FakeFirestore } from './fakeFirestore';
import {
  SUPERVISOR_ATTEMPT_WINDOW_MS,
  SUPERVISOR_AUDIT_COLLECTION,
  SUPERVISOR_CREDENTIAL_COLLECTION,
  SUPERVISOR_GRANT_COLLECTION,
  SUPERVISOR_MAX_ATTEMPTS,
  isSupervisorLockedOut,
  setSupervisorCredential,
  supervisorAttemptStatus,
  consumeSupervisorGrant,
  verifySupervisorCredential,
} from '../supervisorVerification';
import {
  RATE_LIMIT_COLLECTION,
  cleanupRateLimitCounters,
  consumeRateLimit,
  peekRateLimit,
  resetRateLimit,
  RateLimiterUnavailableError,
} from '../../shared/durableRateLimit';

const TENANT = 'tenant_alpha';
const OTHER_TENANT = 'tenant_beta';
const GOOD_CODE = '4815-2299';
const NAMESPACE = 'test_namespace';
const WINDOW = 10 * 60_000;
const BASE = Date.UTC(2026, 0, 1, 12, 0, 0);

const limitOpts = (scope: string, now = BASE) => ({
  fieldValue: mockFieldValue,
  namespace: NAMESPACE,
  scope,
  max: 3,
  windowMs: WINDOW,
  now,
});

const withTenant = async (code = GOOD_CODE, tenantId = TENANT): Promise<FakeFirestore> => {
  const db = createFakeFirestore();
  const result = await setSupervisorCredential(db as never, mockFieldValue, {
    tenantId,
    code,
    actorUid: 'owner_1',
  });
  assert.equal(result.ok, true);
  return db;
};

const attempt = (db: FakeFirestore, overrides: Record<string, unknown> = {}) =>
  verifySupervisorCredential({
    db: db as never,
    fieldValue: mockFieldValue,
    tenantId: TENANT,
    operation: 'REOPEN_BUSINESS_DAY',
    code: GOOD_CODE,
    actorUid: 'staff_1',
    actorRole: 'manager',
    correlationId: 'corr_sv',
    now: BASE,
    ...overrides,
  } as never);

describe('durable rate limit', () => {
  it('admits up to the limit and refuses the next', async () => {
    const db = createFakeFirestore();
    const opts = limitOpts('scope_a');

    for (let i = 1; i <= 3; i += 1) {
      const decision = await consumeRateLimit({ ...opts, db: db as never });
      assert.equal(decision.allowed, true, `attempt ${i} should be admitted`);
      assert.equal(decision.count, i);
      assert.equal(decision.remaining, 3 - i);
    }

    const refused = await consumeRateLimit({ ...opts, db: db as never });
    assert.equal(refused.allowed, false);
    assert.equal(refused.remaining, 0);
    assert.ok(refused.retryAfterMs > 0, 'a refusal says how long to wait');
  });

  it('keeps counting after the limit, so a stale counter cannot be inherited', async () => {
    const db = createFakeFirestore();
    const opts = limitOpts('scope_a');

    for (let i = 0; i < 6; i += 1) {
      await consumeRateLimit({ ...opts, db: db as never });
    }
    const late = await consumeRateLimit({ ...opts, db: db as never });
    assert.equal(late.allowed, false);
    assert.equal(
      late.count,
      7,
      'a limiter that stops counting at the limit leaks the true attempt volume'
    );
  });

  it('serializes concurrent attempts so none is admitted for free', async () => {
    const db = createFakeFirestore();
    const opts = limitOpts('scope_concurrent');
    const max = 5;

    /**
     * The race this asserts against is the one a read-then-write limiter has:
     * several callers read the same count, all decide they are within the limit,
     * and all write the same incremented value — so the real number of admitted
     * attempts exceeds `max`.
     */
    const decisions = await Promise.all(
      Array.from({ length: 20 }, () =>
        consumeRateLimit({ ...opts, db: db as never, max })
      )
    );

    const admitted = decisions.filter((d) => d.allowed).length;
    assert.equal(admitted, max, `exactly ${max} attempts may be admitted, got ${admitted}`);

    const finalCount = (await peekRateLimit({ db: db as never, ...limitOpts('scope_concurrent') }))
      .count;
    assert.equal(finalCount, 20, 'every attempt was counted, none was lost to a read-write race');
  });

  it('persists across a process restart', async () => {
    const opts = limitOpts('scope_restart');
    const before = createFakeFirestore();
    await consumeRateLimit({ ...opts, db: before as never });
    assert.equal((await peekRateLimit({ ...opts, db: before as never })).count, 1);

    /**
     * A restart is a new store that has never seen the old one, so the only state
     * that can survive is the state that was written down. Rebuilding a fresh
     * handle from the documents the first one left behind is exactly that — the
     * keys are full `collection/id` paths, which is what the seed expects.
     */
    const seed: Record<string, Record<string, unknown>> = {};
    for (const [id, data] of Object.entries(before.readAll(RATE_LIMIT_COLLECTION))) {
      seed[`${RATE_LIMIT_COLLECTION}/${id}`] = data;
    }
    const after = createFakeFirestore({ seed });
    const carried = await consumeRateLimit({ ...opts, db: after as never });
    assert.equal(
      carried.count,
      2,
      'a restart does not hand the caller a fresh budget'
    );
  });

  it('starts a fresh window after expiry', async () => {
    const db = createFakeFirestore();
    const opts = limitOpts('scope_window', BASE);

    for (let i = 0; i < 3; i += 1) await consumeRateLimit({ ...opts, db: db as never });
    assert.equal((await consumeRateLimit({ ...opts, db: db as never })).allowed, false);

    // Just past the window boundary.
    const later = await consumeRateLimit({ ...limitOpts('scope_window', BASE + WINDOW), db: db as never });
    assert.equal(later.allowed, true, 'a new window starts clean');
    assert.equal(later.count, 1);
  });

  it('does not resume a counter left over from an earlier window', async () => {
    const db = createFakeFirestore({
      seed: {
        // A document from a window that has already closed.
        [`${RATE_LIMIT_COLLECTION}/${NAMESPACE}__stale__${BASE - 2 * WINDOW}`]: {
          namespace: NAMESPACE,
          scope: 'stale',
          windowStart: BASE - 2 * WINDOW,
          count: 99,
        },
      },
    });
    const decision = await consumeRateLimit({ ...limitOpts('stale'), db: db as never });
    assert.equal(decision.allowed, true, 'an expired counter cannot keep a scope locked out');
    assert.equal(decision.count, 1);
  });

  it('isolates scopes', async () => {
    const db = createFakeFirestore();
    for (let i = 0; i < 3; i += 1) {
      await consumeRateLimit({ ...limitOpts('scope_x'), db: db as never });
    }
    assert.equal((await consumeRateLimit({ ...limitOpts('scope_x'), db: db as never })).allowed, false);
    assert.equal(
      (await consumeRateLimit({ ...limitOpts('scope_y'), db: db as never })).allowed,
      true,
      'one scope exhausting its budget must not affect another'
    );
  });

  it('isolates namespaces so features cannot share a budget', async () => {
    const db = createFakeFirestore();
    for (let i = 0; i < 3; i += 1) {
      await consumeRateLimit({ ...limitOpts('scope_x'), db: db as never });
    }
    const other = await consumeRateLimit({
      ...limitOpts('scope_x'),
      db: db as never,
      namespace: 'other_namespace',
    });
    assert.equal(other.allowed, true, 'a different feature has its own counter');
  });

  it('throws a typed error when storage is unreachable', async () => {
    const db = createFakeFirestore();
    db.setUnreachableCollections([RATE_LIMIT_COLLECTION]);

    await assert.rejects(
      () => consumeRateLimit({ ...limitOpts('scope_down'), db: db as never }),
      (error: unknown) => {
        assert.ok(error instanceof RateLimiterUnavailableError);
        assert.equal((error as RateLimiterUnavailableError).cause instanceof Error, true);
        return true;
      }
    );
  });

  it('does not write anything when the transaction fails', async () => {
    const db = createFakeFirestore();
    db.setUnreachableCollections([RATE_LIMIT_COLLECTION]);
    await consumeRateLimit({ ...limitOpts('scope_down'), db: db as never }).catch(() => undefined);

    db.setUnreachableCollections([]);
    const after = await peekRateLimit({ db: db as never, ...limitOpts('scope_down') });
    assert.equal(after.count, 0, 'a failed consume must not leave a partial count behind');
  });

  it('resets the window on an explicit reset', async () => {
    const db = createFakeFirestore();
    const opts = limitOpts('scope_reset');
    for (let i = 0; i < 3; i += 1) await consumeRateLimit({ ...opts, db: db as never });

    await resetRateLimit({
      db: db as never,
      namespace: NAMESPACE,
      scope: 'scope_reset',
      windowMs: WINDOW,
      now: BASE,
    });

    const after = await consumeRateLimit({ ...opts, db: db as never });
    assert.equal(after.allowed, true);
    assert.equal(after.count, 1);
  });

  it('cleans up counters whose window has closed', async () => {
    const db = createFakeFirestore({
      seed: {
        [`${RATE_LIMIT_COLLECTION}/${NAMESPACE}__old__${BASE - 5 * WINDOW}`]: {
          namespace: NAMESPACE,
          scope: 'old',
          windowStart: BASE - 5 * WINDOW,
          count: 4,
          resetAt: BASE - 4 * WINDOW,
        },
      },
    });

    const removed = await cleanupRateLimitCounters(db as never, BASE);
    assert.equal(removed, 1);
    assert.deepEqual(db.readAll(RATE_LIMIT_COLLECTION), {}, 'closed windows do not accumulate');
  });
});

describe('supervisor verification limit behaviour', () => {
  it('locks the tenant out and then admits it again after the window', async () => {
    const db = await withTenant();

    for (let i = 0; i < SUPERVISOR_MAX_ATTEMPTS; i += 1) {
      const result = await attempt(db, { code: `bad-${i}` });
      assert.equal(result.ok, false, `attempt ${i + 1} should fail`);
    }

    const locked = await attempt(db, { code: GOOD_CODE });
    assert.equal(locked.ok, false);
    assert.equal(!locked.ok && locked.code, 'RATE_LIMITED');
    assert.ok(!locked.ok && locked.retryAfterMs && locked.retryAfterMs > 0);
    assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {}, 'a lockout issues no grant');

    const later = await attempt(db, { code: GOOD_CODE, now: BASE + SUPERVISOR_ATTEMPT_WINDOW_MS + 1 });
    assert.equal(later.ok, true, 'the correct code works once the window rolls over');
  });

  it('counts malformed codes against the budget', async () => {
    const db = await withTenant();
    for (let i = 0; i < SUPERVISOR_MAX_ATTEMPTS; i += 1) {
      const result = await attempt(db, { code: '12' });
      assert.equal(result.ok, false);
    }
    const locked = await attempt(db, { code: GOOD_CODE });
    assert.equal(locked.ok, false);
    assert.equal(locked.ok === false && locked.code, 'RATE_LIMITED', 'short codes still consume budget');
  });

  it('shares the counter across instances', async () => {
    const db = await withTenant();
    const opts = { db: db as never, fieldValue: mockFieldValue, now: BASE };

    /**
     * Two "instances" is two independent call paths against the same durable
     * state. With a module-level Map each would have its own count and the
     * effective ceiling would be `max × instances`.
     */
    const instanceA = () =>
      verifySupervisorCredential({
        ...opts,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        code: 'wrong-a',
        actorUid: 'staff_a',
        actorRole: 'manager',
        correlationId: 'a',
      } as never);

    const instanceB = () =>
      verifySupervisorCredential({
        ...opts,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        code: 'wrong-b',
        actorUid: 'staff_b',
        actorRole: 'manager',
        correlationId: 'b',
      } as never);

    for (let i = 0; i < Math.ceil(SUPERVISOR_MAX_ATTEMPTS / 2); i += 1) {
      await instanceA();
      await instanceB();
    }

    const shared = await attempt(db, { code: GOOD_CODE });
    assert.equal(
      shared.ok === false && shared.code,
      'RATE_LIMITED',
      'the budget is shared, not per-instance'
    );
  });

  it('survives a restart with the counter intact', async () => {
    const db = await withTenant();
    await attempt(db, { code: 'wrong-1' });
    await attempt(db, { code: 'wrong-2' });

    // Simulate a restart: nothing in-process is reused, only stored state.
    const status = await supervisorAttemptStatus(db as never, TENANT, BASE);
    assert.equal(status.count, 2, 'the count is in storage, not memory');
    assert.equal(await isSupervisorLockedOut(db as never, TENANT, BASE), false);

    await attempt(db, { code: 'wrong-3' });
    await attempt(db, { code: 'wrong-4' });
    await attempt(db, { code: 'wrong-5' });
    assert.equal(
      await isSupervisorLockedOut(db as never, TENANT, BASE),
      true,
      'the lockout is durable'
    );
  });

  it('keeps one tenant lockout from blocking another', async () => {
    const db = await withTenant();
    assert.equal(
      (
        await setSupervisorCredential(db as never, mockFieldValue, {
          tenantId: OTHER_TENANT,
          code: GOOD_CODE,
          actorUid: 'owner_1',
        })
      ).ok,
      true
    );

    for (let i = 0; i < SUPERVISOR_MAX_ATTEMPTS; i += 1) {
      await attempt(db, { code: `bad-${i}` });
    }

    assert.equal(await isSupervisorLockedOut(db as never, TENANT, BASE), true);
    assert.equal(
      await isSupervisorLockedOut(db as never, OTHER_TENANT, BASE),
      false,
      'a lockout is scoped to the tenant that caused it'
    );

    const other = await attempt(db, { tenantId: OTHER_TENANT });
    assert.equal(other.ok, true);
  });

  it('clears the counter on a verified success', async () => {
    const db = await withTenant();
    await attempt(db, { code: 'wrong-one' });
    await attempt(db, { code: 'wrong-two' });
    assert.equal((await supervisorAttemptStatus(db as never, TENANT, BASE)).count, 2);

    await attempt(db, { code: GOOD_CODE });
    assert.equal(
      (await supervisorAttemptStatus(db as never, TENANT, BASE)).count,
      0,
      'a verified code clears the suspicion, for every instance'
    );
  });

  it('fails closed when the limiter cannot be reached', async () => {
    const db = await withTenant();
    db.setUnreachableCollections([RATE_LIMIT_COLLECTION]);

    const result = await attempt(db, { code: GOOD_CODE });
    assert.equal(
      result.ok,
      false,
      'an unavailable limiter must not admit unlimited attempts against the secret'
    );
    assert.deepEqual(db.readAll(SUPERVISOR_GRANT_COLLECTION), {});
  });

  it('still issues a grant when the limiter fails open by configuration', async () => {
    const db = await withTenant();
    db.setUnreachableCollections([RATE_LIMIT_COLLECTION]);

    const result = await attempt(db, {
      code: GOOD_CODE,
      rateLimiterFailureMode: 'open',
    });
    assert.equal(result.ok, true, 'the explicit open mode admits the attempt');
  });

  it('reports the limiter failure in the audit trail', async () => {
    const db = await withTenant();
    db.setUnreachableCollections([RATE_LIMIT_COLLECTION]);
    await attempt(db, { code: GOOD_CODE });

    const audits = Object.values(db.readAll(SUPERVISOR_AUDIT_COLLECTION));
    assert.ok(
      audits.some((entry) => entry.outcome === 'refused'),
      'an attempt refused by an unavailable limiter is still auditable'
    );
  });

  it('audits the lockout with its retry window', async () => {
    const db = await withTenant();
    for (let i = 0; i <= SUPERVISOR_MAX_ATTEMPTS; i += 1) {
      await attempt(db, { code: 'nope' });
    }

    const audits = Object.values(db.readAll(SUPERVISOR_AUDIT_COLLECTION));
    const lockouts = audits.filter((entry) => entry.reason === 'rate_limited');
    assert.ok(lockouts.length >= 1, 'the lockout itself is auditable');
    assert.ok(Number(lockouts[0]?.retryAfterMs) > 0);
  });

  it('preserves grant binding, single use and expiry after the limiter change', async () => {
    const db = await withTenant();
    const granted = await attempt(db, { code: GOOD_CODE });
    assert.equal(granted.ok, true);
    if (!granted.ok) return;
    const grant = granted.grant;

    const redeem = (overrides: Record<string, unknown> = {}) =>
      consumeSupervisorGrant(db as never, mockFieldValue, {
        token: grant.token,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
        now: BASE,
        ...overrides,
      } as never);

    assert.equal((await redeem()).ok, true, 'a grant is redeemable once');
    assert.equal((await redeem()).ok, false, 'and not twice');

    const second = await attempt(db, { code: GOOD_CODE });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    assert.equal(
      (await redeem({ token: second.grant.token, actorUid: 'other' })).ok,
      false,
      'a grant stays bound to its actor'
    );
    assert.equal(
      (
        await redeem({
          token: second.grant.token,
          operation: 'RESOLVE_PRICING_REVIEW',
        })
      ).ok,
      false,
      'a grant stays bound to its operation'
    );
    assert.equal(
      (await redeem({ token: second.grant.token, now: BASE + 60 * 60_000 })).ok,
      false,
      'a grant still expires'
    );
    assert.equal(
      (await redeem({ token: second.grant.token, tenantId: OTHER_TENANT })).ok,
      false,
      'a grant stays bound to its tenant'
    );
  });

  it('refuses to redeem two grants concurrently', async () => {
    const db = await withTenant();
    const granted = await attempt(db, { code: GOOD_CODE });
    assert.equal(granted.ok, true);
    if (!granted.ok) return;

    /**
     * Redemption is a compare-and-set on `consumedAt`. Two callers racing with the
     * same grant must produce exactly one winner, or the single-use property is
     * advisory.
     */
    const redeem = () =>
      consumeSupervisorGrant(db as never, mockFieldValue, {
        token: granted.grant.token,
        tenantId: TENANT,
        operation: 'REOPEN_BUSINESS_DAY',
        actorUid: 'staff_1',
        now: BASE,
      } as never);

    const outcomes = await Promise.all([redeem(), redeem(), redeem()]);
    assert.equal(
      outcomes.filter((outcome) => outcome.ok).length,
      1,
      'exactly one redeemer may win'
    );
  });

  it('still refuses an unconfigured tenant and an unauthenticated caller', async () => {
    const db = createFakeFirestore();
    const unconfigured = await attempt(db, { code: GOOD_CODE });
    assert.equal(unconfigured.ok === false && unconfigured.code, 'NO_CREDENTIAL_CONFIGURED');

    const anon = await attempt(db, { actorUid: '' });
    assert.equal(anon.ok === false && anon.code, 'UNAUTHENTICATED');

    assert.equal(
      db.read(SUPERVISOR_CREDENTIAL_COLLECTION, TENANT),
      undefined,
      'no credential is invented'
    );
  });
});
