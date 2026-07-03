/**
 * LocationSDK — in-memory Open Geocoding cache hook (M2 PR-8).
 */

import { sdkOk } from '../../../core/resultHelpers';
import type { OpenGeocodingCachePort, OpenGeocodingCacheEntry } from './OpenGeocodingPorts';

export class InMemoryOpenGeocodingCache implements OpenGeocodingCachePort {
  private readonly store = new Map<string, OpenGeocodingCacheEntry<unknown>>();

  async get<T>(key: string) {
    const entry = this.store.get(key);
    if (!entry) {
      return sdkOk(null);
    }
    if (Date.now() >= entry.expiresAtMs) {
      this.store.delete(key);
      return sdkOk(null);
    }
    return sdkOk(entry.value as T);
  }

  async set<T>(key: string, value: T, ttlMs: number) {
    this.store.set(key, {
      value,
      expiresAtMs: Date.now() + ttlMs,
    });
    return sdkOk(undefined);
  }

  clear(): void {
    this.store.clear();
  }
}

export class NoOpOpenGeocodingCache implements OpenGeocodingCachePort {
  async get<T>(_key: string) {
    return sdkOk<T | null>(null);
  }

  async set<T>(_key: string, _value: T, _ttlMs: number) {
    return sdkOk(undefined);
  }
}

export function createInMemoryOpenGeocodingCache(): InMemoryOpenGeocodingCache {
  return new InMemoryOpenGeocodingCache();
}

export function createNoOpOpenGeocodingCache(): NoOpOpenGeocodingCache {
  return new NoOpOpenGeocodingCache();
}

/** Default cache TTL — 15 minutes for search/reverse results. */
export const DEFAULT_OPEN_GEOCODING_CACHE_TTL_MS = 15 * 60 * 1000;
