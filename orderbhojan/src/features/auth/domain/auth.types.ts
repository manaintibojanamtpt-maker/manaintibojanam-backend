import { z } from 'zod';

export const phoneNumberSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit OTP');

export const phoneOtpSendSchema = z.object({
  phone: phoneNumberSchema,
});

export const phoneOtpVerifySchema = z.object({
  phone: phoneNumberSchema,
  otp: otpSchema,
});

export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  phone: phoneNumberSchema.optional(),
  email: z.string().email().optional(),
});

export type PhoneOtpSendInput = z.infer<typeof phoneOtpSendSchema>;
export type PhoneOtpVerifyInput = z.infer<typeof phoneOtpVerifySchema>;
export type ProfilePatchInput = z.infer<typeof profilePatchSchema>;

export type AuthProviderId = 'google' | 'phone' | 'guest';

export interface AuthSessionUser {
  readonly uid: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phoneNumber: string | null;
  readonly photoURL: string | null;
  readonly provider: AuthProviderId;
  readonly isAnonymous: boolean;
}

export type AuthPhase =
  | 'loading'
  | 'unconfigured'
  | 'guest'
  | 'authenticated';

export interface AuthStateSnapshot {
  readonly phase: AuthPhase;
  readonly user: AuthSessionUser | null;
  readonly guestBrowsing: boolean;
}

export function resolveAuthPhase(input: {
  firebaseConfigured: boolean;
  authReady: boolean;
  firebaseUser: AuthSessionUser | null;
  guestBrowsing: boolean;
}): AuthPhase {
  if (!input.firebaseConfigured) {
    return input.guestBrowsing ? 'guest' : 'unconfigured';
  }
  if (!input.authReady) {
    return 'loading';
  }
  if (input.firebaseUser && !input.firebaseUser.isAnonymous && input.firebaseUser.provider !== 'guest') {
    return 'authenticated';
  }
  if (input.guestBrowsing || !input.firebaseUser) {
    return 'guest';
  }
  return 'guest';
}

export function isProtectedRoute(pathname: string): boolean {
  const protectedPrefixes = ['/orders', '/favorites', '/notifications'];
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function requiresAuthenticatedUser(pathname: string): boolean {
  return isProtectedRoute(pathname);
}
