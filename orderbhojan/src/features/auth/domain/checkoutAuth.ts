import { z } from 'zod';
import { phoneNumberSchema, type AuthPhase, type AuthSessionUser } from './auth.types';

export type CheckoutAuthBlockReason = 'sign_in_required' | 'phone_verification_required';

export interface CheckoutAuthGateResult {
  readonly allowed: boolean;
  readonly reason?: CheckoutAuthBlockReason;
  readonly message: string;
}

function normalizeIndianPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

/** True when Firebase session includes a verified Indian mobile number. */
export function hasVerifiedCheckoutPhone(sessionUser: AuthSessionUser | null): boolean {
  if (!sessionUser) return false;
  if (sessionUser.provider === 'phone') {
    const phone = normalizeIndianPhone(sessionUser.phoneNumber);
    return phone ? phoneNumberSchema.safeParse(phone).success : false;
  }
  const linkedPhone = normalizeIndianPhone(sessionUser.phoneNumber);
  return linkedPhone ? phoneNumberSchema.safeParse(linkedPhone).success : false;
}

/** Google sign-in with a verified email satisfies checkout identity (phone collected on checkout). */
export function hasVerifiedCheckoutEmail(sessionUser: AuthSessionUser | null): boolean {
  if (!sessionUser || sessionUser.provider !== 'google') return false;
  const email = sessionUser.email?.trim();
  if (!email) return false;
  return z.string().email().safeParse(email).success;
}

export function hasVerifiedCheckoutIdentity(sessionUser: AuthSessionUser | null): boolean {
  return hasVerifiedCheckoutPhone(sessionUser) || hasVerifiedCheckoutEmail(sessionUser);
}

export function needsCheckoutPhoneVerification(input: {
  status: AuthPhase;
  sessionUser: AuthSessionUser | null;
}): boolean {
  return resolveCheckoutAuthGate(input).reason === 'phone_verification_required';
}

/** Guests may browse and fill cart; only authenticated users with verified phone may place orders. */
export function resolveCheckoutAuthGate(input: {
  status: AuthPhase;
  sessionUser: AuthSessionUser | null;
}): CheckoutAuthGateResult {
  if (input.status === 'loading') {
    return {
      allowed: false,
      reason: 'sign_in_required',
      message: 'Checking your session…',
    };
  }

  if (input.status !== 'authenticated' || !input.sessionUser || input.sessionUser.isAnonymous) {
    return {
      allowed: false,
      reason: 'sign_in_required',
      message: 'Sign in to place your order. Browsing and cart stay available without an account.',
    };
  }

  if (!hasVerifiedCheckoutIdentity(input.sessionUser)) {
    return {
      allowed: false,
      reason: 'phone_verification_required',
      message: 'Verify your mobile number with OTP before placing an order.',
    };
  }

  return {
    allowed: true,
    message: '',
  };
}

export function canPlaceMarketplaceOrder(input: {
  status: AuthPhase;
  sessionUser: AuthSessionUser | null;
}): boolean {
  return resolveCheckoutAuthGate(input).allowed;
}
