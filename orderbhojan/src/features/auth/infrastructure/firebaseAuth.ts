import {
  GoogleAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  getRedirectResult,
  linkWithCredential,
  signInAnonymously,
  signInWithCredential,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/firebase';
import { isNativePlatform, shouldUseGoogleAuthRedirect } from '@/lib/nativePlatform';
import { obDebugLog } from '@/lib/obDebug';
import { persistAuthReturnToFromCurrentUrl } from '../domain/authReturnTo';
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

export class AnonymousAuthDisabledError extends AuthFlowError {
  constructor() {
    super('Anonymous sign-in is disabled for this Firebase project.');
    this.name = 'AnonymousAuthDisabledError';
  }
}

let recaptchaVerifier: RecaptchaVerifier | null = null;
let googleRedirectResultPromise: Promise<AuthSessionUser | null> | null = null;
const AUTH_REDIRECT_ATTEMPT_KEY = 'auth_redirect_attempted';
const AUTH_REDIRECT_ATTEMPT_TTL_MS = 15 * 60 * 1000;
let phoneConfirmation: ConfirmationResult | null = null;
let phoneVerificationId: string | null = null;
let nativePhoneVerificationId: string | null = null;
let nativePhoneListenerRemovers: Array<() => void> = [];

export function isAnonymousAuthDisabled(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  if (code === 'auth/admin-restricted-operation') return true;
  const message = error instanceof Error ? error.message : String(error);
  return /admin-restricted-operation/i.test(message);
}

function clearNativePhoneListeners(): void {
  for (const remove of nativePhoneListenerRemovers) {
    remove();
  }
  nativePhoneListenerRemovers = [];
}

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

function isNoCredentialsAvailableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /no credentials available/i.test(message);
}

function mapNativeGoogleSignInError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) {
    return error;
  }
  const message = error instanceof Error ? error.message : 'Native Google sign-in failed.';
  if (isNoCredentialsAvailableError(error)) {
    return new AuthFlowError(
      'Google sign-in is not configured for this Android build. Add the debug/release SHA-1 fingerprint to the bhojanos-prod Firebase Android app (com.bhojanos.orderbhojan), re-download google-services.json, then rebuild.',
    );
  }
  return new AuthFlowError(message);
}

async function completeNativeGoogleSignIn(
  auth: ReturnType<typeof requireAuth>,
  result: Awaited<
    ReturnType<(typeof import('@capacitor-firebase/authentication'))['FirebaseAuthentication']['signInWithGoogle']>
  >,
): Promise<AuthSessionUser> {
  obDebugLog('auth', 'Native Google sign-in completed', result.credential?.providerId);

  const idToken = result.credential?.idToken;
  if (!idToken) {
    throw new AuthFlowError('Google sign-in did not return an ID token.');
  }

  const credential = GoogleAuthProvider.credential(idToken, result.credential?.accessToken ?? undefined);
  const signedIn = await signInWithCredential(auth, credential);
  return mapFirebaseUser(signedIn.user);
}

async function signInWithGoogleNative(): Promise<AuthSessionUser> {
  const auth = requireAuth();
  try {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    try {
      const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: true });
      return await completeNativeGoogleSignIn(auth, result);
    } catch (credentialManagerError) {
      if (!isNoCredentialsAvailableError(credentialManagerError)) {
        throw credentialManagerError;
      }
      obDebugLog('auth', 'Credential Manager unavailable, retrying legacy Google sign-in');
      const result = await FirebaseAuthentication.signInWithGoogle({ useCredentialManager: false });
      return await completeNativeGoogleSignIn(auth, result);
    }
  } catch (error) {
    obDebugLog('auth', 'Native Google sign-in failed', error);
    throw mapNativeGoogleSignInError(error);
  }
}

function isPopupBlockedError(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  return code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request';
}

async function beginGoogleRedirectSignIn(
  auth: ReturnType<typeof requireAuth>,
  provider: GoogleAuthProvider,
): Promise<never> {
  persistAuthReturnToFromCurrentUrl();
  sessionStorage.setItem('auth_redirecting', 'true');
  sessionStorage.setItem(AUTH_REDIRECT_ATTEMPT_KEY, String(Date.now()));
  await signInWithRedirect(auth, provider);
  throw new AuthFlowError('Google sign-in redirect in progress.');
}

export async function signInWithGoogleAccount(): Promise<AuthSessionUser> {
  const auth = requireAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  if (isNativePlatform()) {
    return signInWithGoogleNative();
  }

  if (shouldUseGoogleAuthRedirect()) {
    return beginGoogleRedirectSignIn(auth, provider);
  }

  try {
    const credential = await signInWithPopup(auth, provider);
    clearGoogleRedirectAttempt();
    return mapFirebaseUser(credential.user);
  } catch (error) {
    if (isPopupBlockedError(error)) {
      obDebugLog('auth', 'Popup blocked — falling back to Google redirect');
      return beginGoogleRedirectSignIn(auth, provider);
    }
    throw error;
  }
}

function readGoogleRedirectAttemptTimestamp(): number | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(AUTH_REDIRECT_ATTEMPT_KEY);
  if (!raw) return null;
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function readGoogleRedirectAttempt(): boolean {
  const timestamp = readGoogleRedirectAttemptTimestamp();
  if (timestamp == null) return false;
  if (Date.now() - timestamp > AUTH_REDIRECT_ATTEMPT_TTL_MS) {
    clearGoogleRedirectAttempt();
    return false;
  }
  return true;
}

export function clearGoogleRedirectAttempt(): void {
  sessionStorage.removeItem(AUTH_REDIRECT_ATTEMPT_KEY);
}

export async function completeGoogleRedirectSignIn(): Promise<AuthSessionUser | null> {
  if (!googleRedirectResultPromise) {
    googleRedirectResultPromise = (async () => {
      const auth = requireAuth();
      try {
        const result = await getRedirectResult(auth);
        if (!result?.user) {
          return null;
        }
        clearGoogleRedirectAttempt();
        return mapFirebaseUser(result.user);
      } catch (error) {
        clearGoogleRedirectAttempt();
        obDebugLog('auth', 'Google redirect result failed', error);
        throw error instanceof AuthFlowError
          ? error
          : new AuthFlowError(
              error instanceof Error ? error.message : 'Google sign-in redirect failed.',
            );
      } finally {
        sessionStorage.removeItem('auth_redirecting');
      }
    })();
  }
  return googleRedirectResultPromise;
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
  try {
    const credential = await signInAnonymously(auth);
    return mapFirebaseUser(credential.user);
  } catch (error) {
    if (isAnonymousAuthDisabled(error)) {
      obDebugLog('auth', 'Anonymous auth disabled — using local guest session');
      throw new AnonymousAuthDisabledError();
    }
    throw error;
  }
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
  phoneVerificationId = null;
  nativePhoneVerificationId = null;
  clearNativePhoneListeners();
}

async function sendPhoneOtpNative(phone: string, linkExistingAccount: boolean): Promise<string> {
  const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
  clearNativePhoneListeners();
  nativePhoneVerificationId = null;

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      clearNativePhoneListeners();
      reject(new AuthFlowError('OTP request timed out. Try again.'));
    }, 120_000);

    void FirebaseAuthentication.addListener('phoneCodeSent', (event) => {
      window.clearTimeout(timeout);
      if (!event.verificationId) {
        clearNativePhoneListeners();
        reject(new AuthFlowError('Phone verification did not return a verification ID.'));
        return;
      }
      nativePhoneVerificationId = event.verificationId;
      resolve(phone);
    }).then((handle) => {
      nativePhoneListenerRemovers.push(() => {
        void handle.remove();
      });
    });

    void FirebaseAuthentication.addListener('phoneVerificationFailed', (event) => {
      window.clearTimeout(timeout);
      clearNativePhoneListeners();
      reject(new AuthFlowError(event.message ?? 'Phone verification failed.'));
    }).then((handle) => {
      nativePhoneListenerRemovers.push(() => {
        void handle.remove();
      });
    });

    const start = linkExistingAccount
      ? FirebaseAuthentication.linkWithPhoneNumber({ phoneNumber: phone })
      : FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phone });

    void start.catch((error) => {
      window.clearTimeout(timeout);
      clearNativePhoneListeners();
      reject(mapNativePhoneSignInError(error));
    });
  });
}

function mapNativePhoneSignInError(error: unknown): AuthFlowError {
  if (error instanceof AuthFlowError) return error;
  const message = error instanceof Error ? error.message : 'Phone verification failed.';
  return new AuthFlowError(message);
}

async function verifyPhoneOtpNative(otp: string): Promise<AuthSessionUser> {
  if (!nativePhoneVerificationId) {
    throw new AuthFlowError('Request OTP before verification.');
  }

  const auth = requireAuth();
  const credential = PhoneAuthProvider.credential(nativePhoneVerificationId, otp);
  const currentUser = auth.currentUser;

  try {
    if (currentUser && !currentUser.isAnonymous) {
      const linked = await linkWithCredential(currentUser, credential);
      nativePhoneVerificationId = null;
      clearNativePhoneListeners();
      return mapFirebaseUser(linked.user);
    }
  } catch (error) {
    obDebugLog('auth', 'Native phone link failed, retrying sign-in', error);
  }

  const signedIn = await signInWithCredential(auth, credential);
  nativePhoneVerificationId = null;
  clearNativePhoneListeners();
  return mapFirebaseUser(signedIn.user);
}

export async function sendPhoneOtp(phone: string, containerId: string): Promise<string> {
  const auth = requireAuth();
  const normalized = phone.startsWith('+91') ? phone : `+91${phone}`;
  phoneConfirmation = null;
  phoneVerificationId = null;

  if (isNativePlatform()) {
    const linkExistingAccount = Boolean(auth.currentUser && !auth.currentUser.isAnonymous);
    return sendPhoneOtpNative(normalized, linkExistingAccount);
  }

  const verifier = createRecaptchaVerifier(containerId);
  const currentUser = auth.currentUser;

  if (currentUser && !currentUser.isAnonymous) {
    const provider = new PhoneAuthProvider(auth);
    phoneVerificationId = await provider.verifyPhoneNumber(normalized, verifier);
    return normalized;
  }

  phoneConfirmation = await signInWithPhoneNumber(auth, normalized, verifier);
  return normalized;
}

export async function verifyPhoneOtp(otp: string): Promise<AuthSessionUser> {
  if (isNativePlatform()) {
    return verifyPhoneOtpNative(otp);
  }

  const auth = requireAuth();

  if (phoneVerificationId) {
    const credential = PhoneAuthProvider.credential(phoneVerificationId, otp);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new AuthFlowError('Sign in before linking your phone number.');
    }
    const linked = await linkWithCredential(currentUser, credential);
    phoneVerificationId = null;
    disposeRecaptchaVerifier();
    return mapFirebaseUser(linked.user);
  }

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
