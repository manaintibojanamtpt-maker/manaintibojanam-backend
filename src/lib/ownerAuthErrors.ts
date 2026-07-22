import { fetchSignInMethodsForEmail, type Auth } from 'firebase/auth';
import { isFirebaseClientConfigReady } from '../config/firebaseClientConfig';

export type PortalAuthPortal = 'owner' | 'admin' | 'superadmin';

const CREDENTIAL_ERROR_CODES = new Set([
  'auth/invalid-credential',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-login-credentials',
]);

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
  return 'Invalid email or password. If you originally signed up with Google, click Continue with Google below.';
}

function ownerGoogleOnlyMessage(): string {
  return 'This account uses Google sign-in only — no password is set. Click Continue with Google below to log in.';
}

function ownerNoAccountMessage(): string {
  return 'No BhojanOS owner account exists for this email. Create one at /owner/register, or sign in with Google if you used that method.';
}

function ownerWrongPasswordMessage(): string {
  return 'Incorrect password for this email. Try again, or use Continue with Google if that is how you registered.';
}

function networkFailureMessage(host: string): string {
  return `Network error during sign-in from ${host}. Hard-refresh (Ctrl+Shift+R), disable VPN/ad blockers blocking identitytoolkit.googleapis.com, then retry. If it persists, open the site in a private window (rules out a stale service worker).`;
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

/** Resolve credential errors with sign-in method lookup when an email is available. */
export async function resolveOwnerLoginError(
  error: unknown,
  email: string | undefined,
  context: OwnerAuthErrorContext = {},
  authInstance?: Auth,
): Promise<string> {
  const code = readAuthErrorCode(error);
  const portal = context.portal ?? 'owner';
  const trimmedEmail = email?.trim().toLowerCase();

  if (
    portal === 'owner' &&
    trimmedEmail &&
    CREDENTIAL_ERROR_CODES.has(code) &&
    authInstance
  ) {
    try {
      const methods = await fetchSignInMethodsForEmail(authInstance, trimmedEmail);
      if (methods.length === 0) {
        return ownerNoAccountMessage();
      }
      if (methods.includes('google.com') && !methods.includes('password')) {
        return ownerGoogleOnlyMessage();
      }
      if (methods.includes('password')) {
        return ownerWrongPasswordMessage();
      }
    } catch {
      // Email enumeration protection or network — fall back to generic copy.
    }
  }

  return formatOwnerAuthError(error, context);
}

export function isBenignOwnerAuthDismiss(error: unknown): boolean {
  const code = readAuthErrorCode(error);
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
