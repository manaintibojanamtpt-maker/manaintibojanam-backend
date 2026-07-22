import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type User,
} from 'firebase/auth';
import { ensureAuthPersistence } from '../firebase';
import { shouldFallbackGoogleAuthRedirect, shouldUseGoogleAuthRedirect } from './nativePlatform';

const REDIRECT_FLAG = 'auth_redirecting';
export const AUTH_REDIRECT_ATTEMPT_KEY = 'auth_redirect_attempted';
const AUTH_REDIRECT_ATTEMPT_TTL_MS = 15 * 60 * 1000;
export const AUTH_RETURN_TO_KEY = 'auth_return_to';
let redirectResultPromise: Promise<User | null> | null = null;

function readRedirectAttemptTimestamp(): number | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(AUTH_REDIRECT_ATTEMPT_KEY);
  if (!raw) return null;
  const timestamp = Number(raw);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function clearGoogleRedirectAttempt(): void {
  sessionStorage.removeItem(AUTH_REDIRECT_ATTEMPT_KEY);
}

/** True when this tab recently started a Google redirect sign-in. */
export function isGoogleRedirectPending(): boolean {
  const timestamp = readRedirectAttemptTimestamp();
  if (timestamp == null) return false;
  if (Date.now() - timestamp > AUTH_REDIRECT_ATTEMPT_TTL_MS) {
    clearGoogleRedirectAttempt();
    return false;
  }
  return true;
}

function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//');
}

export function persistAuthReturnTo(returnTo: string): void {
  if (!isSafeReturnPath(returnTo)) return;
  sessionStorage.setItem(AUTH_RETURN_TO_KEY, returnTo.trim());
}

function readReturnToFromSearch(): string | null {
  if (typeof window === 'undefined') return null;
  const returnTo = new URLSearchParams(window.location.search).get('returnTo')?.trim();
  return isSafeReturnPath(returnTo) ? returnTo : null;
}

export function persistAuthReturnToFromCurrentUrl(): void {
  const returnTo = readReturnToFromSearch();
  if (returnTo) {
    persistAuthReturnTo(returnTo);
  }
}

export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/**
 * Web Google sign-in: popup-first.
 * Redirect through *.firebaseapp.com is broken by Chrome bounce tracking / 3P storage blocks.
 */
export async function signInWithGoogleAccount(auth: Auth): Promise<User | null> {
  const provider = createGoogleAuthProvider();

  if (!shouldUseGoogleAuthRedirect()) {
    try {
      const result = await signInWithPopup(auth, provider);
      clearGoogleRedirectAttempt();
      return result.user;
    } catch (error) {
      if (!shouldFallbackGoogleAuthRedirect(error)) {
        throw error;
      }
    }
  }

  persistAuthReturnToFromCurrentUrl();
  sessionStorage.setItem(REDIRECT_FLAG, 'true');
  sessionStorage.setItem(AUTH_REDIRECT_ATTEMPT_KEY, String(Date.now()));
  await signInWithRedirect(auth, provider);
  return null;
}

/** Recover redirect sign-in when getRedirectResult races persistence or a stale SW drops callback params. */
function resolveGoogleRedirectSessionUser(auth: Auth): User | null {
  const current = auth.currentUser;
  if (!current || current.isAnonymous) return null;
  const isGoogle = current.providerData.some((entry) => entry.providerId === 'google.com');
  return isGoogle ? current : null;
}

export async function completeGoogleRedirectSignIn(auth: Auth): Promise<User | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      try {
        await ensureAuthPersistence();
        const result = await getRedirectResult(auth);
        if (result?.user) {
          clearGoogleRedirectAttempt();
          return result.user;
        }
        if (isGoogleRedirectPending()) {
          const recovered = resolveGoogleRedirectSessionUser(auth);
          if (recovered) {
            clearGoogleRedirectAttempt();
            return recovered;
          }
        }
        return null;
      } catch (error) {
        clearGoogleRedirectAttempt();
        throw error;
      } finally {
        sessionStorage.removeItem(REDIRECT_FLAG);
      }
    })();
  }
  return redirectResultPromise;
}

export const OWNER_GOOGLE_REGISTER_KEY = 'owner_google_register_pending';

export interface OwnerGoogleRegisterPending {
  name: string;
  restaurantName: string;
  mobileNumber: string;
  email: string;
}

export function saveOwnerGoogleRegisterPending(data: OwnerGoogleRegisterPending): void {
  sessionStorage.setItem(OWNER_GOOGLE_REGISTER_KEY, JSON.stringify(data));
}

export function loadOwnerGoogleRegisterPending(): OwnerGoogleRegisterPending | null {
  const raw = sessionStorage.getItem(OWNER_GOOGLE_REGISTER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OwnerGoogleRegisterPending;
  } catch {
    return null;
  }
}

export function clearOwnerGoogleRegisterPending(): void {
  sessionStorage.removeItem(OWNER_GOOGLE_REGISTER_KEY);
}
