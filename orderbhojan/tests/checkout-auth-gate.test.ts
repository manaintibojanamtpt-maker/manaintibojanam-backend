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

  it('uses redirect google sign-in on mobile web and popup on desktop', () => {
    const nativePlatform = readFileSync(join(root, 'src/lib/nativePlatform.ts'), 'utf8');
    const firebaseAuth = readFileSync(
      join(root, 'src/features/auth/infrastructure/firebaseAuth.ts'),
      'utf8',
    );
    const authService = readFileSync(
      join(root, 'src/features/auth/application/authService.ts'),
      'utf8',
    );
    assert.match(nativePlatform, /if \(isNativePlatform\(\)\) return false/);
    assert.match(nativePlatform, /isMobileWebClient/);
    assert.match(firebaseAuth, /shouldUseGoogleAuthRedirect\(\)/);
    assert.match(firebaseAuth, /signInWithRedirect/);
    assert.match(firebaseAuth, /signInWithPopup/);
    assert.match(firebaseAuth, /completeGoogleRedirectSignIn/);
    assert.match(firebaseAuth, /persistAuthReturnToFromCurrentUrl/);
    assert.match(firebaseAuth, /auth_return_to|persistAuthReturnToFromCurrentUrl/);
    assert.match(authService, /handlePendingGoogleRedirect/);
    assert.doesNotMatch(authService, /if \(!readGoogleRedirectAttempt\(\)\)/);
  });

  it('RequireAuth preserves returnTo query over router state alone', () => {
    const requireAuth = readFileSync(join(root, 'src/features/auth/ui/RequireAuth.tsx'), 'utf8');
    assert.match(requireAuth, /returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
    assert.match(requireAuth, /state=\{\{ from: returnTo \}\}/);
  });

  it('prepare checkout in parallel with cart validation', () => {
    const flow = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');
    assert.match(flow, /enabled: canCheckout && Boolean\(prepareSignature\)/);
    assert.doesNotMatch(flow, /cartValidationReady/);
    assert.match(flow, /CHECKOUT_PREPARE_TIMEOUT_MS/);
    assert.match(flow, /signal/);
  });

  it('persists auth return destination before Google redirect', () => {
    const authShell = readFileSync(
      join(root, 'src/presentation/auth/OrderBhojanAuthShellPage.tsx'),
      'utf8',
    );
    const authReturn = readFileSync(
      join(root, 'src/features/auth/domain/authReturnTo.ts'),
      'utf8',
    );
    assert.match(authShell, /persistAuthReturnTo\(redirectTo\)/);
    assert.match(authReturn, /AUTH_RETURN_TO_KEY = 'auth_return_to'/);
    assert.match(authReturn, /sessionStorage\.setItem\(AUTH_RETURN_TO_KEY/);
  });

  it('resumes stored returnTo after auth redirect', () => {
    const authProvider = readFileSync(join(root, 'src/shared/providers/AuthProvider.tsx'), 'utf8');
    const navigator = readFileSync(
      join(root, 'src/presentation/auth/AuthReturnNavigator.tsx'),
      'utf8',
    );
    const resolveRedirect = readFileSync(
      join(root, 'src/presentation/auth/resolveAuthRedirect.ts'),
      'utf8',
    );
    assert.match(authProvider, /handlePendingGoogleRedirect/);
    assert.match(navigator, /readPersistedAuthReturnTo/);
    assert.match(resolveRedirect, /readPersistedAuthReturnTo/);
  });

  it('skips native cart-to-checkout route transition delay', () => {
    const transition = readFileSync(
      join(root, 'src/presentation/shell/OrderBhojanRouteTransition.tsx'),
      'utf8',
    );
    assert.match(transition, /isNativePlatform\(\)/);
    assert.match(transition, /from === '\/cart' && to === '\/checkout'/);
    assert.match(transition, /mode=\{fastCheckout \? 'sync' : 'wait'\}/);
  });
});
