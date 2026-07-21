import { obDebugTrustEvent } from '@/lib/obDebug';

export const AUTH_RETURN_TO_KEY = 'auth_return_to';

function isSafeReturnPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const trimmed = path.trim();
  return trimmed.startsWith('/') && !trimmed.startsWith('//');
}

export function persistAuthReturnTo(returnTo: string): void {
  if (!isSafeReturnPath(returnTo)) return;
  sessionStorage.setItem(AUTH_RETURN_TO_KEY, returnTo.trim());
  obDebugTrustEvent(
    'auth',
    'persistAuthReturnTo',
    { returnTo: returnTo.trim(), source: 'sessionStorage' },
    { authReturnTo: returnTo.trim() },
  );
}

export function readPersistedAuthReturnTo(): string | null {
  const stored = sessionStorage.getItem(AUTH_RETURN_TO_KEY);
  const value = isSafeReturnPath(stored) ? stored.trim() : null;
  if (value) {
    obDebugTrustEvent(
      'auth',
      'readPersistedAuthReturnTo',
      { returnTo: value, source: 'sessionStorage' },
      { authReturnTo: value },
    );
  }
  return value;
}

export function clearAuthReturnTo(): void {
  sessionStorage.removeItem(AUTH_RETURN_TO_KEY);
  obDebugTrustEvent('auth', 'clearAuthReturnTo', { action: 'cleared' }, { authReturnTo: null });
}

export function readReturnToFromSearch(search = typeof window !== 'undefined' ? window.location.search : ''): string | null {
  const returnTo = new URLSearchParams(search).get('returnTo')?.trim();
  const value = isSafeReturnPath(returnTo) ? returnTo : null;
  if (value) {
    obDebugTrustEvent(
      'auth',
      'readReturnToFromSearch',
      { returnTo: value, source: 'query' },
      { authReturnTo: value },
    );
  }
  return value;
}

/** Persist `?returnTo=` from the current URL before OAuth redirect unloads the page. */
export function persistAuthReturnToFromCurrentUrl(): void {
  const returnTo = readReturnToFromSearch();
  if (returnTo) {
    persistAuthReturnTo(returnTo);
  }
}
