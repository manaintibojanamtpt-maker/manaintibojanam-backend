import { isFirebaseConfigured } from '@/firebase';
import { bootstrapCustomerSession } from './profileBootstrapService';
import {
  getCurrentIdToken,
  signInAsGuestAccount,
  signInWithGoogleAccount,
  sendPhoneOtp,
  signOutCurrentUser,
  verifyPhoneOtp,
  type AuthFlowError,
} from '../infrastructure/firebaseAuth';
import { useAuthSessionStore } from '../store/authSessionStore';
import type { AuthSessionUser } from '../domain/auth.types';

export interface AuthActionResult {
  readonly user: AuthSessionUser | null;
}

async function finalizeAuthenticatedSession(user: AuthSessionUser): Promise<AuthSessionUser> {
  useAuthSessionStore.getState().setGuestBrowsing(false);
  await bootstrapCustomerSession(user);
  return user;
}

export async function continueAsGuest(): Promise<AuthActionResult> {
  useAuthSessionStore.getState().setGuestBrowsing(true);
  if (!isFirebaseConfigured()) {
    return { user: null };
  }
  const user = await signInAsGuestAccount();
  return { user };
}

export async function signInWithGoogle(): Promise<AuthActionResult> {
  const user = await signInWithGoogleAccount();
  return { user: await finalizeAuthenticatedSession(user) };
}

export async function startPhoneSignIn(phone: string, containerId: string): Promise<string> {
  return sendPhoneOtp(phone, containerId);
}

export async function completePhoneSignIn(otp: string): Promise<AuthActionResult> {
  const user = await verifyPhoneOtp(otp);
  return { user: await finalizeAuthenticatedSession(user) };
}

export async function signOut(): Promise<void> {
  await signOutCurrentUser();
  useAuthSessionStore.getState().resetSession();
}

export async function fetchBearerToken(forceRefresh = false): Promise<string | null> {
  if (useAuthSessionStore.getState().guestBrowsing) {
    return null;
  }
  return getCurrentIdToken(forceRefresh);
}

export function isAuthFlowError(error: unknown): error is AuthFlowError {
  return error instanceof Error && error.name === 'AuthFlowError';
}
