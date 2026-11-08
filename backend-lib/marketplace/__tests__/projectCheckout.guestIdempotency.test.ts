/**
 * Guest checkout idempotency — reuses the authenticated checkout attempt
 * infrastructure, but binds the attempt to a phone-derived uid so a guest
 * retry with the same clientAttemptId returns the existing order instead of
 * creating a duplicate.
 *
 * Tests the low-level helpers (guestIdentityUid, commitCheckoutAttempt) and
 * the replay contract exposed by readCheckoutReplay / commitCheckoutAttempt.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFakeFirestore, mockFieldValue } from '../../orders/__tests__/fakeFirestore.js';
import {
  guestIdentityUid,
  checkoutAttemptRef,
  checkoutRequestHash,
  readCheckoutReplay,
  commitCheckoutAttempt,
} from '../customerCheckoutAttempt.js';

const PHONE = '9876543210';

// ── guestIdentityUid ────────────────────────────────────────────────────────

describe('guestIdentityUid — stable, format-valid, phone-bound', () => {
  it('is deterministic for the same phone', () => {
    assert.equal(guestIdentityUid(PHONE), guestIdentityUid(PHONE));
  });

  it('is deterministic across whitespace and case', () => {
    assert.equal(guestIdentityUid(' 9876543210 '), guestIdentityUid('9876543210'));
    assert.equal(guestIdentityUid('9876543210'), guestIdentityUid('9876543210'));
  });

  it('differs for different phones', () => {
    assert.notEqual(guestIdentityUid('9876543210'), guestIdentityUid('9876543211'));
  });

  it('matches the 16-128 alphanumeric+hyphen+underscore pattern', () => {
    const uid = guestIdentityUid(PHONE);
    assert.ok(/^[a-zA-Z0-9_-]{16,128}$/.test(uid), `uid=${uid} must match attempt-id charset`);
  });

  it('is accepted by checkoutAttemptRef (no 400)', () => {
    const db = createFakeFirestore();
    assert.doesNotThrow(() => checkoutAttemptRef(db as never, guestIdentityUid(PHONE), 'guest-attempt-001-minimum-16'));
  });

  it('does not crash on empty or missing phone (guarded before 400 validation)', () => {
    assert.doesNotThrow(() => guestIdentityUid(''));
    assert.doesNotThrow(() => guestIdentityUid('   '));
    assert.doesNotThrow(() => guestIdentityUid(undefined as unknown as string));
    assert.equal(guestIdentityUid(''), guestIdentityUid('   '));
  });
});

// ── commitCheckoutAttempt / readCheckoutReplay contract ──────────────────────

describe('guest checkout attempt — atomic CAS, replayed flag, payload conflict', () => {
  const attemptId = 'guest-attempt-001-minimum-16c';
  const request = { phone: PHONE, lines: [{ itemId: 'i1', quantity: 1 }] };
  const result = { kind: 'cod', orderId: 'ord-guest-001' } as never;
  const write = () => {};

  it('first commit returns replayed=false and persists the attempt', async () => {
    const db = createFakeFirestore();
    const out = await commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, request, result, write);
    assert.equal(out.replayed, false);
    assert.deepEqual(out.result, result);
    const stored = db.read('customer_checkout_attempts', checkoutAttemptRef(db as never, guestIdentityUid(PHONE), attemptId).id);
    assert.ok(stored, 'attempt doc must be persisted');
    assert.equal(stored?.hash, checkoutRequestHash(request));
  });

  it('second commit with same request returns replayed=true and does NOT re-run write', async () => {
    const db = createFakeFirestore();
    let writeCalls = 0;
    const write = () => { writeCalls++; };
    await commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, request, result, write);
    const out = await commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, request, result, write);
    assert.equal(out.replayed, true);
    assert.deepEqual(out.result, result);
    assert.equal(writeCalls, 1, 'write must run exactly once across both commits');
  });

  it('readCheckoutReplay returns null before any commit', async () => {
    const db = createFakeFirestore();
    const replay = await readCheckoutReplay(db as never, guestIdentityUid(PHONE), attemptId, request);
    assert.equal(replay, null);
  });

  it('readCheckoutReplay returns { result, replayed: true } after commit', async () => {
    const db = createFakeFirestore();
    await commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, request, result, write);
    const replay = await readCheckoutReplay(db as never, guestIdentityUid(PHONE), attemptId, request);
    assert.ok(replay, 'replay must exist after commit');
    assert.equal(replay!.replayed, true);
    assert.deepEqual(replay!.result, result);
  });

  it('conflicting payload (different lines) is rejected with 409', async () => {
    const db = createFakeFirestore();
    await commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, request, result, write);
    const conflict = { phone: PHONE, lines: [{ itemId: 'i2', quantity: 9 }] };
    await assert.rejects(
      () => commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, conflict, result, write),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /payload conflict/i);
        assert.equal((err as { statusCode?: number }).statusCode, 409);
        return true;
      }
    );
  });

  it('same attemptId, different phone gets a separate document', async () => {
    const db = createFakeFirestore();
    const otherPhone = '9876543211';
    const out = await commitCheckoutAttempt(db as never, guestIdentityUid(otherPhone), attemptId, request, result, write);
    assert.equal(out.replayed, false, 'different phone must be a fresh commit');
  });
});

// ── rejection semantics ──────────────────────────────────────────────────────

describe('guest checkout attempt — rejected state', () => {
  const attemptId = 'guest-reject-001-minimum-16ca';
  const request = { phone: PHONE, lines: [{ itemId: 'i1', quantity: 1 }] };

  it('commit after reject is rejected with 409', async () => {
    const db = createFakeFirestore();
    const { rejectCheckoutAttempt } = await import('../customerCheckoutAttempt.js');
    await rejectCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId);
    await assert.rejects(
      () => commitCheckoutAttempt(db as never, guestIdentityUid(PHONE), attemptId, request, { kind: 'cod', orderId: 'x' } as never, () => {}),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /rejected/i);
        assert.equal((err as { statusCode?: number }).statusCode, 409);
        return true;
      }
    );
  });
});