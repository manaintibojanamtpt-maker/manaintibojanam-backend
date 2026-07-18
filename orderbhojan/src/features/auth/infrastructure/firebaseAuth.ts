import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  getRedirectResult,
  signInAnonymously,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/firebase';
import { shouldUseGoogleAuthRedirect } from '@/lib/nativePlatform';
import type { AuthProviderId, AuthSessionUser } from '../domain/auth.types';

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthConfigurationError';
  }
}

export class AuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

let recaptchaVerifier: RecaptchaVerifier | null = null;
let phoneConfirmation: ConfirmationResult | null = null;

function requireAuth() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw new AuthConfigurationError('Firebase Auth is not configured for this environment.');
  }
  return auth;
}

export function mapFirebaseUser(user: User): AuthSessionUser {
  const provider = resolveProvider(user);
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    provider,
    isAnonymous: user.isAnonymous,
  };
}

function resolveProvider(user: User): AuthProviderId {
  if (user.isAnonymous) return 'guest';
  const providerIds = user.providerData.map((entry) => entry.providerId);
  if (providerIds.includes('google.com')) return 'google';
  if (providerIds.includes('phone')) return 'phone';
  return 'guest';
}

export async function signInWithGoogleAccount(): Promise<AuthSessionUser> {
  const auth = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (shouldUseGoogleAuthRedirect()) {
    sessionStorage.setItem('auth_redirecting', 'true');
    await signInWithRedirect(auth, provider);
    throw new AuthFlowError('Google sign-in redirect in progress.');
  }

  const credential = await signInWithPopup(auth, provider);
  return mapFirebaseUser(credential.user);
}

export async function completeGoogleRedirectSignIn(): Promise<AuthSessionUser | null> {
  const auth = requireAuth();
  const result = await getRedirectResult(auth);
  if (!result?.user) {
    return null;
  }
  sessionStorage.removeItem('auth_redirecting');
  return mapFirebaseUser(result.user);
}

export async function signInAsGuestAccount(): Promise<AuthSessionUser | null> {
  if (!isFirebaseConfigured()) {
    return null;
  }
  const auth = requireAuth();
  const existing = auth.currentUser;
  if (existing?.isAnonymous) {
    return mapFirebaseUser(existing);
  }
  if (existing && !existing.isAnonymous) {
    await firebaseSignOut(auth);
  }
  const credential = await signInAnonymously(auth);
  return mapFirebaseUser(credential.user);
}

export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  disposeRecaptchaVerifier();
  const auth = requireAuth();
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    callback: () => undefined,
  });
  return recaptchaVerifier;
}

export function disposeRecaptchaVerifier(): void {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
  phoneConfirmation = null;
}

export async function sendPhoneOtp(phone: string, containerId: string): Promise<string> {
  const auth = requireAuth();
  const normalized = phone.startsWith('+91') ? phone : `+91${phone}`;
  const verifier = createRecaptchaVerifier(containerId);
  phoneConfirmation = await signInWithPhoneNumber(auth, normalized, verifier);
  return normalized;
}

export async function verifyPhoneOtp(otp: string): Promise<AuthSessionUser> {
  if (!phoneConfirmation) {
    throw new AuthFlowError('Request OTP before verification.');
  }
  const credential = await phoneConfirmation.confirm(otp);
  phoneConfirmation = null;
  disposeRecaptchaVerifier();
  return mapFirebaseUser(credential.user);
}

export async function signOutCurrentUser(): Promise<void> {
  disposeRecaptchaVerifier();
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user || user.isAnonymous) {
    return null;
  }
  return user.getIdToken(forceRefresh);
}
