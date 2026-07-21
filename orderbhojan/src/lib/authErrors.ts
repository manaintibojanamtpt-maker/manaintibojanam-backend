export function formatAuthError(error: unknown): string {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: string }).code ?? '')
      : '';

  if (code === 'auth/unauthorized-domain') {
    return 'This site is not authorized for sign-in yet. Ask your admin to add orderbhojan.web.app and orderbhojan.com under Firebase Auth → Settings → Authorized domains (bhojanos-prod project).';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in was cancelled. Please try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error during sign-in. Check your connection and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is disabled for this app. Contact support.';
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return 'An account already exists with a different sign-in method. Try phone OTP or another Google account.';
  }
  if (code === 'auth/admin-restricted-operation') {
    return 'Guest browsing is available without Firebase anonymous sign-in.';
  }

  return error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
}
