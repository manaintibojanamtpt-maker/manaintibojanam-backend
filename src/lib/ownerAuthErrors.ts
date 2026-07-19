/** User-facing Firebase Auth errors for the owner portal login page. */
export function formatOwnerAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  const message = error instanceof Error ? error.message : '';
  const host = typeof window !== 'undefined' ? window.location.hostname : 'this site';

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
      return 'Network error during sign-in. Check your connection, disable VPN/ad blockers, and try again.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase is misconfigured on this page. Hard-refresh (Ctrl+Shift+R) or try again in a few minutes.';
    case 'auth/account-exists-with-different-credential':
      return 'This email was registered with a password. Sign in with email and password instead.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact hello@bhojanos.com for help.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled for this project. Try Continue with Google or contact support.';
    default:
      if (/api.?key|firebase.*not configured/i.test(message)) {
        return 'Firebase is misconfigured on this page. Hard-refresh (Ctrl+Shift+R) or try again in a few minutes.';
      }
      return message || 'Sign-in failed. Try again or contact hello@bhojanos.com.';
  }
}

export function isBenignOwnerAuthDismiss(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
