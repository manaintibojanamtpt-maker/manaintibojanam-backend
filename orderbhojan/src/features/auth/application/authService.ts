import { getFirebaseAuth, isFirebaseConfigured } from '@/firebase';
import { bootstrapCustomerSession } from './profileBootstrapService';
import {
  completeGoogleRedirectSignIn,
  getCurrentIdToken,
  isAnonymousAuthDisabled,
  signInAsGuestAccount,
  signInWithGoogleAccount,
  sendPhoneOtp,
  signOutCurrentUser,
  verifyPhoneOtp,
  AuthFlowError,
  AnonymousAuthDisabledError,
} from '../infrastructure/firebaseAuth';
import { useAuthSessionStore } from '../store/authSessionStore';
import type { AuthSessionUser } from '../domain/auth.types';

export interface AuthActionResult {
  readonly user: AuthSessionUser | null;
}

async function finalizeAuthenticatedSession(user: AuthSessionUser): Promise<AuthSessionUser> {
  useAuthSessionStore.getState().setGuestBrowsing(false);
  try {
    await bootstrapCustomerSession(user);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[OrderBhojan] Customer profile bootstrap skipped after sign-in', error);
    }
  }
  return user;
}

export async function continueAsGuest(): Promise<AuthActionResult> {
  useAuthSessionStore.getState().setGuestBrowsing(true);
  if (!isFirebaseConfigured()) {
    return { user: null };
  }
  try {
    const user = await signInAsGuestAccount();
    return { user };
  } catch (error) {
    if (error instanceof AnonymousAuthDisabledError || isAnonymousAuthDisabled(error)) {
      useAuthSessionStore.getState().setAnonymousAuthBlocked(true);
      return { user: null };
    }
    throw error;
  }
}

export async function signInWithGoogle(): Promise<AuthActionResult> {
  try {
    const user = await signInWithGoogleAccount();
    return { user: await finalizeAuthenticatedSession(user) };
  } catch (error) {
    if (error instanceof AuthFlowError && error.message.includes('redirect')) {
      return { user: null };
    }
    throw error;
  }
}

export async function handlePendingGoogleRedirect(): Promise<AuthActionResult> {
  const user = await completeGoogleRedirectSignIn();
  if (!user) {
    return { user: null };
  }
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
  const user = getFirebaseAuth()?.currentUser;

  // Signed-in customers always get a bearer token, even if guestBrowsing was stale in storage.
  if (user && !user.isAnonymous) {
    return user.getIdToken(forceRefresh);
  }

  if (useAuthSessionStore.getState().guestBrowsing) {
    return null;
  }

  return getCurrentIdToken(forceRefresh);
}

export function isAuthFlowError(error: unknown): error is AuthFlowError {
  return error instanceof Error && error.name === 'AuthFlowError';
}
