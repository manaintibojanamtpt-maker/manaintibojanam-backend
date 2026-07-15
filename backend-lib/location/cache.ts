const cache = new Map<string, { value: unknown; expiresAt: number }>();

const DEFAULT_TTL_MS = Number(process.env.LOCATION_REVERSE_CACHE_TTL_MS || 24 * 60 * 60 * 1000);

export function toRoundedCacheKey(lat: number, lng: number): string {
  return `rev:${lat.toFixed(5)}:${lng.toFixed(5)}`;
}

export function getCachedReverseGeocode<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedReverseGeocode<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function clearReverseGeocodeCache(): void {
  cache.clear();
}

export function getReverseGeocodeCacheSize(): number {
  return cache.size;
}
