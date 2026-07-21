export const AUTH_RETURN_TO_KEY = 'auth_return_to';

function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//');
}

export function persistAuthReturnTo(returnTo: string): void {
  if (!isSafeReturnPath(returnTo)) return;
  sessionStorage.setItem(AUTH_RETURN_TO_KEY, returnTo.trim());
}

export function readPersistedAuthReturnTo(): string | null {
  const stored = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  return isSafeReturnPath(stored) ? stored.trim() : null;
}

export function clearAuthReturnTo(): void {
  sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
}

export function readReturnToFromSearch(search = typeof window !== 'undefined' ? window.location.search : ''): string | null {
  const returnTo = new URLSearchParams(search).get('returnTo')?.trim();
  return isSafeReturnPath(returnTo) ? returnTo : null;
}

/** Persist `?returnTo=` from the current URL before OAuth redirect unloads the page. */
export function persistAuthReturnToFromCurrentUrl(): void {
  const returnTo = readReturnToFromSearch();
  if (returnTo) {
    persistAuthReturnTo(returnTo);
  }
}
