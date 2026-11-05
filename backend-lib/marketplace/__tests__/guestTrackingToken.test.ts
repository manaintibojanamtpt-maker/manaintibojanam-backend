import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signGuestOrderToken, verifyGuestOrderToken, parseGuestAuthorizationHeader } from '../../guestOrderToken.js';

const TEST_SECRET = 'test-guest-order-secret-32-chars-min!!';

describe('guest tracking token — COD, UPI, authenticated, invalid', () => {
  it('signs a guest-tracking token for COD orderId', () => {
    const { token, expiresAt } = signGuestOrderToken('cod-order-001', { secret: TEST_SECRET });
    assert.ok(token, 'token must be present');
    assert.ok(expiresAt.getTime() > Date.now(), 'token must not be expired yet');
    // Verify against the correct orderId
    const payload = verifyGuestOrderToken(token, 'cod-order-001', { secret: TEST_SECRET });
    assert.equal(payload.orderId, 'cod-order-001');
  });

  it('signs a guest-tracking token for UPI orderId — same flow, different orderId', () => {
    const { token } = signGuestOrderToken('upi-order-002', { secret: TEST_SECRET });
    const payload = verifyGuestOrderToken(token, 'upi-order-002', { secret: TEST_SECRET });
    assert.equal(payload.orderId, 'upi-order-002');
  });

  it('rejects guest-tracking with wrong orderId', () => {
    const { token } = signGuestOrderToken('order-a', { secret: TEST_SECRET });
    assert.throws(
      () => verifyGuestOrderToken(token, 'order-b', { secret: TEST_SECRET }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /does not match/i);
        return true;
      }
    );
  });

  it('rejects guest-tracking with an expired token', () => {
    const token = signGuestOrderToken('expired', { secret: TEST_SECRET, ttlSeconds: -1 }).token;
    assert.throws(
      () => verifyGuestOrderToken(token, 'expired', { secret: TEST_SECRET }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /expired/i);
        return true;
      }
    );
  });

  it('rejects guest-tracking with a tampered token', () => {
    const { token } = signGuestOrderToken('order-tamper', { secret: TEST_SECRET });
    assert.throws(
      () => verifyGuestOrderToken(token, 'order-tamper', { secret: 'different-secret-32-chars-min!!' }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /invalid/i);
        return true;
      }
    );
  });

  it('parseGuestAuthorizationHeader extracts token from Guest scheme', () => {
    assert.equal(parseGuestAuthorizationHeader('Guest eyJhbGc'), 'eyJhbGc');
    assert.equal(parseGuestAuthorizationHeader('Bearer abc'), null);
    assert.equal(parseGuestAuthorizationHeader(undefined), null);
  });

  it('token is scoped to a single orderId — cannot track another order', () => {
    const { token } = signGuestOrderToken('my-order', { secret: TEST_SECRET });
    const payload = verifyGuestOrderToken(token, 'my-order', { secret: TEST_SECRET });
    assert.equal(payload.orderId, 'my-order');
    // The same token must fail for a different orderId
    assert.throws(
      () => verifyGuestOrderToken(token, 'other-order', { secret: TEST_SECRET }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /does not match/i);
        return true;
      }
    );
  });
});
