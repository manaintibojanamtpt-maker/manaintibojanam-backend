import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type Auth,
  type User,
} from 'firebase/auth';
import { shouldUseGoogleAuthRedirect } from './nativePlatform';

const REDIRECT_FLAG = 'auth_redirecting';

export function createGoogleAuthProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** Web Google sign-in: redirect on hosted sites (COOP-safe), popup only when redirect is disabled. */
export async function signInWithGoogleAccount(auth: Auth): Promise<User | null> {
  const provider = createGoogleAuthProvider();

  if (shouldUseGoogleAuthRedirect()) {
    sessionStorage.setItem(REDIRECT_FLAG, 'true');
    await signInWithRedirect(auth, provider);
    return null;
  }

  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function completeGoogleRedirectSignIn(auth: Auth): Promise<User | null> {
  const result = await getRedirectResult(auth);
  if (result?.user) {
    sessionStorage.removeItem(REDIRECT_FLAG);
    return result.user;
  }
  return null;
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
