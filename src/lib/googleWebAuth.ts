import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type User,
} from 'firebase/auth';
import { ensureAuthPersistence } from '../firebase';
import { shouldUseGoogleAuthRedirect } from './nativePlatform';

const REDIRECT_FLAG = 'auth_redirecting';
export const AUTH_RETURN_TO_KEY = 'auth_return_to';
let redirectResultPromise: Promise<User | null> | null = null;

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

/** Web Google sign-in: redirect on hosted sites (COOP-safe), popup only when redirect is disabled. */
export async function signInWithGoogleAccount(auth: Auth): Promise<User | null> {
  const provider = createGoogleAuthProvider();

  if (shouldUseGoogleAuthRedirect()) {
    persistAuthReturnToFromCurrentUrl();
    sessionStorage.setItem(REDIRECT_FLAG, 'true');
    await signInWithRedirect(auth, provider);
    return null;
  }

  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function completeGoogleRedirectSignIn(auth: Auth): Promise<User | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = (async () => {
      try {
        await ensureAuthPersistence();
        const result = await getRedirectResult(auth);
        if (!result?.user) {
          return null;
        }
        return result.user;
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
