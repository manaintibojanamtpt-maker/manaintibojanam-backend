import { isFirebaseClientConfigReady } from '../config/firebaseClientConfig';

export type PortalAuthPortal = 'owner' | 'admin' | 'superadmin';

export type OwnerAuthErrorContext = {
  configReady?: boolean;
  portal?: PortalAuthPortal;
};

function readAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: string }).code ?? '');
  }
  return '';
}

function readAuthErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: string }).message ?? '');
  }
  return error instanceof Error ? error.message : '';
}

function authorizedDomainsGuidance(host: string): string {
  return `Sign-in is blocked for ${host}. In Firebase Console (bhojanos-prod) add ${host}, bhojanos.com, www.bhojanos.com, and your hosting origin (e.g. bhojanos-admin.web.app, orderbhojan.web.app) under Authentication → Settings → Authorized domains.`;
}

function invalidCredentialMessage(portal: PortalAuthPortal | undefined): string {
  if (portal === 'superadmin') {
    return 'This email/password is not registered in bhojanos-prod Firebase Auth, or the password is wrong. Create the account in Firebase Console, then grant superadmin via /api/platform/grant-superadmin.';
  }
  if (portal === 'admin') {
    return 'Invalid admin credentials for bhojanos-prod. Check your email and password, or create the account in Firebase Console → Authentication.';
  }
  return 'Invalid email or password. If you originally signed up with Google, use Continue with Google instead.';
}

function networkFailureMessage(host: string): string {
  return `Network error during sign-in from ${host}. Check your connection, disable VPN/ad blockers blocking identitytoolkit.googleapis.com, hard-refresh (Ctrl+Shift+R), and verify the bhojanos-prod API key HTTP referrer restrictions include ${host}, bhojanos.com, and www.bhojanos.com.`;
}

function looksLikeUnauthorizedDomain(code: string, message: string): boolean {
  return (
    code === 'auth/unauthorized-domain' ||
    /unauthorized.?domain|not authorized for oauth/i.test(message)
  );
}

/** User-facing Firebase Auth errors for owner/admin/super-admin login pages. */
export function formatOwnerAuthError(error: unknown, context: OwnerAuthErrorContext = {}): string {
  const code = readAuthErrorCode(error);
  const message = readAuthErrorMessage(error);
  const host = typeof window !== 'undefined' ? window.location.hostname : 'this site';
  const configReady = context.configReady ?? isFirebaseClientConfigReady();
  const portal = context.portal;

  if (!configReady) {
    return 'Firebase is not configured on this page. Hard-refresh (Ctrl+Shift+R). If this persists, auth bootstrap may be blocked — disable VPN/ad blockers and ensure /api/client-config loads, or contact hello@bhojanos.com.';
  }

  if (looksLikeUnauthorizedDomain(code, message)) {
    return authorizedDomainsGuidance(host);
  }

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return invalidCredentialMessage(portal);
    case 'auth/too-many-requests':
      return 'Too many failed sign-in attempts. Wait a few minutes, then try again or reset your password.';
    case 'auth/network-request-failed':
      return networkFailureMessage(host);
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
        return networkFailureMessage(host);
      }
      return message || 'Sign-in failed. Try again or contact hello@bhojanos.com.';
  }
}

/** Alias for admin/super-admin portals — same mapper, portal-specific credential copy. */
export function formatPortalAuthError(error: unknown, context: OwnerAuthErrorContext = {}): string {
  return formatOwnerAuthError(error, context);
}

export function isBenignOwnerAuthDismiss(error: unknown): boolean {
  const code = readAuthErrorCode(error);
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
