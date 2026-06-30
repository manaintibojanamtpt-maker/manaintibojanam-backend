import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import {
  GUEST_TOKEN_AUDIENCE,
  GUEST_TOKEN_ISSUER,
  GUEST_TOKEN_TTL_SECONDS,
  GuestOrderTokenError,
  parseGuestAuthorizationHeader,
  signGuestOrderToken,
  verifyGuestOrderToken,
} from '../guestOrderToken';

const TEST_SECRET = 'test-guest-order-secret-32-chars-min!!';

describe('guestOrderToken', () => {
  it('signs and verifies a token for the same orderId', () => {
    const orderId = 'order-abc-123';
    const { token, expiresAt } = signGuestOrderToken(orderId, { secret: TEST_SECRET });

    assert.ok(token);
    assert.ok(expiresAt.getTime() > Date.now());

    const payload = verifyGuestOrderToken(token, orderId, { secret: TEST_SECRET });
    assert.equal(payload.orderId, orderId);
    assert.ok(payload.exp);
    assert.ok(payload.iat);
  });

  it('rejects a token when expected orderId does not match', () => {
    const { token } = signGuestOrderToken('order-a', { secret: TEST_SECRET });

    assert.throws(
      () => verifyGuestOrderToken(token, 'order-b', { secret: TEST_SECRET }),
      (error: unknown) => {
        assert.ok(error instanceof GuestOrderTokenError);
        assert.equal(error.code, 'ORDER_MISMATCH');
        return true;
      }
    );
  });

  it('rejects an expired token', () => {
    const orderId = 'order-expired';
    const token = jwt.sign(
      { orderId },
      TEST_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: -10,
        audience: GUEST_TOKEN_AUDIENCE,
        issuer: GUEST_TOKEN_ISSUER,
      }
    );

    assert.throws(
      () => verifyGuestOrderToken(token, orderId, { secret: TEST_SECRET }),
      (error: unknown) => {
        assert.ok(error instanceof GuestOrderTokenError);
        assert.equal(error.code, 'EXPIRED');
        return true;
      }
    );
  });

  it('rejects a tampered token signed with a different secret', () => {
    const orderId = 'order-tamper';
    const { token } = signGuestOrderToken(orderId, { secret: TEST_SECRET });

    assert.throws(
      () => verifyGuestOrderToken(token, orderId, { secret: 'another-secret-32-chars-minimum!!' }),
      (error: unknown) => {
        assert.ok(error instanceof GuestOrderTokenError);
        assert.equal(error.code, 'INVALID_TOKEN');
        return true;
      }
    );
  });

  it('rejects a malformed token payload missing orderId', () => {
    const token = jwt.sign(
      {},
      TEST_SECRET,
      {
        algorithm: 'HS256',
        expiresIn: GUEST_TOKEN_TTL_SECONDS,
        audience: GUEST_TOKEN_AUDIENCE,
        issuer: GUEST_TOKEN_ISSUER,
      }
    );

    assert.throws(
      () => verifyGuestOrderToken(token, 'any-order', { secret: TEST_SECRET }),
      (error: unknown) => {
        assert.ok(error instanceof GuestOrderTokenError);
        assert.equal(error.code, 'MALFORMED');
        return true;
      }
    );
  });

  it('parses Guest authorization header', () => {
    assert.equal(parseGuestAuthorizationHeader('Guest eyJhbGciOiJIUzI1NiJ9'), 'eyJhbGciOiJIUzI1NiJ9');
    assert.equal(parseGuestAuthorizationHeader('Bearer firebase-token'), null);
    assert.equal(parseGuestAuthorizationHeader(undefined), null);
    assert.equal(parseGuestAuthorizationHeader('Guest '), null);
  });

  it('requires ORDER_GUEST_TOKEN_SECRET when no override secret is provided', () => {
    const previous = process.env.ORDER_GUEST_TOKEN_SECRET;
    delete process.env.ORDER_GUEST_TOKEN_SECRET;

    try {
      assert.throws(
        () => signGuestOrderToken('order-missing-secret'),
        (error: unknown) => {
          assert.ok(error instanceof GuestOrderTokenError);
          assert.equal(error.code, 'MISSING_SECRET');
          return true;
        }
      );
    } finally {
      if (previous !== undefined) {
        process.env.ORDER_GUEST_TOKEN_SECRET = previous;
      }
    }
  });
});
