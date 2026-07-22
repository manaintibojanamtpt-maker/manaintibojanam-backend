/**
 * Session-backed owner data store for app-like instant navigation.
 * Memory + sessionStorage: paint cached cards immediately, refresh in background.
 */

const PREFIX = 'bhojanos_owner_swr:';

export function readOwnerSessionJson<T>(key: string): T | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeOwnerSessionJson(key: string, value: unknown): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function clearOwnerSessionKey(key: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(`${PREFIX}${key}`);
  } catch {
    /* ignore */
  }
}
