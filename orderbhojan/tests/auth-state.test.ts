import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isProtectedRoute,
  phoneNumberSchema,
  phoneOtpVerifySchema,
  resolveAuthPhase,
} from '../src/features/auth/domain/auth.types';

describe('auth state machine', () => {
  it('supports guest without firebase config', () => {
    assert.equal(
      resolveAuthPhase({
        firebaseConfigured: false,
        authReady: true,
        firebaseUser: null,
        guestBrowsing: true,
      }),
      'guest',
    );
  });

  it('resolves authenticated google user', () => {
    assert.equal(
      resolveAuthPhase({
        firebaseConfigured: true,
        authReady: true,
        firebaseUser: {
          uid: 'u1',
          displayName: 'Test',
          email: 'test@example.com',
          phoneNumber: null,
          photoURL: null,
          provider: 'google',
          isAnonymous: false,
        },
        guestBrowsing: false,
      }),
      'authenticated',
    );
  });

  it('marks protected routes', () => {
    assert.equal(isProtectedRoute('/profile'), false);
    assert.equal(isProtectedRoute('/orders/abc/track'), true);
    assert.equal(isProtectedRoute('/discovery'), false);
    assert.equal(isProtectedRoute('/checkout'), false);
  });
});

describe('auth zod schemas', () => {
  it('validates indian phone numbers', () => {
    assert.equal(phoneNumberSchema.safeParse('9876543210').success, true);
    assert.equal(phoneNumberSchema.safeParse('1234567890').success, false);
  });

  it('validates otp payload', () => {
    assert.equal(
      phoneOtpVerifySchema.safeParse({ phone: '9876543210', otp: '123456' }).success,
      true,
    );
  });
});
