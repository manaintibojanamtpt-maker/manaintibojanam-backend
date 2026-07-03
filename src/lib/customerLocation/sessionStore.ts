/**
 * M2 PR-10 — Customer location session persistence (sessionStorage).
 */

import type { CustomerCanonicalLocation, CustomerLocationSessionRecord } from './types';

const SESSION_KEY = 'bhos-customer-location-session';

const getSessionStorage = (): Storage | null => {
  if (typeof globalThis.sessionStorage === 'undefined') {
    return null;
  }
  return globalThis.sessionStorage;
};

export function readCustomerLocationSession(): CustomerCanonicalLocation | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(SESSION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CustomerLocationSessionRecord;
    if (!parsed?.location?.lat || !parsed.location.lng || !parsed.location.geohash) {
      return null;
    }
    return parsed.location;
  } catch {
    return null;
  }
}

export function writeCustomerLocationSession(location: CustomerCanonicalLocation): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  const record: CustomerLocationSessionRecord = {
    location,
    savedAt: Date.now(),
  };

  try {
    storage.setItem(SESSION_KEY, JSON.stringify(record));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearCustomerLocationSession(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
