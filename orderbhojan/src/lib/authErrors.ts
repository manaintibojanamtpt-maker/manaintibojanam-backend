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

  return error instanceof Error ? error.message : 'Sign-in failed. Please try again.';
}
