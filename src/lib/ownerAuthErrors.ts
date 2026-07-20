import { isFirebaseClientConfigReady } from '../config/firebaseClientConfig';

export type OwnerAuthErrorContext = {
  configReady?: boolean;
};

function readAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code ?? '');
  }
  return '';
}

function readAuthErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

/** User-facing Firebase Auth errors for the owner portal login page. */
export function formatOwnerAuthError(error: unknown, context: OwnerAuthErrorContext = {}): string {
  const code = readAuthErrorCode(error);
  const message = readAuthErrorMessage(error);
  const host = typeof window !== 'undefined' ? window.location.hostname : 'this site';
  const configReady = context.configReady ?? isFirebaseClientConfigReady();

  if (!configReady) {
    return 'Firebase is not configured on this page. Hard-refresh (Ctrl+Shift+R). If this persists, auth bootstrap may be blocked — disable VPN/ad blockers and ensure /api/client-config loads, or contact hello@bhojanos.com.';
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. If you originally signed up with Google, use Continue with Google instead.';
    case 'auth/unauthorized-domain':
      return `Sign-in is blocked for ${host}. In Firebase Console (bhojanos-prod) add both bhojanos.com and www.bhojanos.com under Authentication → Settings → Authorized domains.`;
    case 'auth/too-many-requests':
      return 'Too many failed sign-in attempts. Wait a few minutes, then try again or reset your password.';
    case 'auth/network-request-failed':
      return 'Network error during sign-in. Check your connection, disable VPN/ad blockers blocking identitytoolkit.googleapis.com, and try again.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase API key rejected on this page. Hard-refresh (Ctrl+Shift+R). If this persists, verify bhojanos-prod API key HTTP referrer restrictions include bhojanos.com and www.bhojanos.com.';
    case 'auth/account-exists-with-different-credential':
      return 'This email was registered with a password. Sign in with email and password instead.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact hello@bhojanos.com for help.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled for this project. Try Continue with Google or contact support.';
    default:
      if (/api.?key|firebase.*not configured|invalid.?api.?key/i.test(message)) {
        return 'Firebase is misconfigured on this page. Hard-refresh (Ctrl+Shift+R) or try again in a few minutes.';
      }
      if (/network|fetch failed|failed to fetch/i.test(message) && code !== 'auth/invalid-credential') {
        return 'Network error during sign-in. Check your connection, disable VPN/ad blockers, and try again.';
      }
      return message || 'Sign-in failed. Try again or contact hello@bhojanos.com.';
  }
}

export function isBenignOwnerAuthDismiss(error: unknown): boolean {
  const code = readAuthErrorCode(error);
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
