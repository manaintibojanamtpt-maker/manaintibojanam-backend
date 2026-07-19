import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  canPlaceMarketplaceOrder,
  hasVerifiedCheckoutPhone,
  resolveCheckoutAuthGate,
} from '../src/features/auth/domain/checkoutAuth';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('checkout auth gate', () => {
  it('blocks guest users from placing orders', () => {
    const gate = resolveCheckoutAuthGate({
      status: 'guest',
      sessionUser: {
        uid: 'anon',
        displayName: null,
        email: null,
        phoneNumber: null,
        photoURL: null,
        provider: 'guest',
        isAnonymous: true,
      },
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, 'sign_in_required');
    assert.equal(canPlaceMarketplaceOrder({ status: 'guest', sessionUser: null }), false);
  });

  it('allows authenticated google users with verified email without phone OTP', () => {
    const sessionUser = {
      uid: 'g1',
      displayName: 'Guest Google',
      email: 'guest@example.com',
      phoneNumber: null,
      photoURL: null,
      provider: 'google' as const,
      isAnonymous: false,
    };
    const gate = resolveCheckoutAuthGate({
      status: 'authenticated',
      sessionUser,
    });
    assert.equal(gate.allowed, true);
    assert.equal(
      canPlaceMarketplaceOrder({
        status: 'authenticated',
        sessionUser,
      }),
      true,
    );
  });

  it('blocks authenticated google users without email or phone', () => {
    const gate = resolveCheckoutAuthGate({
      status: 'authenticated',
      sessionUser: {
        uid: 'g1',
        displayName: 'Guest Google',
        email: null,
        phoneNumber: null,
        photoURL: null,
        provider: 'google',
        isAnonymous: false,
      },
    });
    assert.equal(gate.allowed, false);
    assert.equal(gate.reason, 'phone_verification_required');
  });

  it('allows phone-authenticated users with verified mobile', () => {
    const sessionUser = {
      uid: 'p1',
      displayName: 'Phone User',
      email: null,
      phoneNumber: '+919876543210',
      photoURL: null,
      provider: 'phone' as const,
      isAnonymous: false,
    };
    assert.equal(hasVerifiedCheckoutPhone(sessionUser), true);
    assert.equal(
      canPlaceMarketplaceOrder({
        status: 'authenticated',
        sessionUser,
      }),
      true,
    );
  });
});

describe('checkout auth wiring', () => {
  it('router protects checkout route with RequireAuth', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /path="checkout"/);
    assert.match(router, /RequireAuth[\s\S]*CheckoutPage/);
  });

  it('checkout flow asserts auth before placing orders', () => {
    const flow = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');
    assert.match(flow, /assertCanPlaceOrder/);
    assert.match(flow, /resolveCheckoutAuthGate/);
  });

  it('uses native google sign-in on capacitor', () => {
    const firebaseAuth = readFileSync(
      join(root, 'src/features/auth/infrastructure/firebaseAuth.ts'),
      'utf8',
    );
    assert.match(firebaseAuth, /@capacitor-firebase\/authentication/);
    assert.match(firebaseAuth, /signInWithGoogleNative/);
    assert.match(firebaseAuth, /sendPhoneOtpNative/);
  });
});
