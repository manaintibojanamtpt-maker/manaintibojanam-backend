import type { RestaurantPublic } from './projectDiscovery.js';

const DEFAULT_TTL_MS = Number(process.env.DISCOVERY_POOL_CACHE_TTL_MS || 120_000);

interface CachedPool {
  readonly restaurants: readonly RestaurantPublic[];
  readonly poolSyncRevision?: string;
}

const poolCache = new Map<string, { value: CachedPool; expiresAt: number }>();
const inFlight = new Map<string, Promise<CachedPool>>();

/** ~110 m grid — nearby kitchens stay stable within TTL. */
export function toDiscoveryPoolCacheKey(lat: number, lng: number): string {
  return `pool:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

export function getCachedDiscoveryPool(key: string): CachedPool | null {
  const entry = poolCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    poolCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedDiscoveryPool(
  key: string,
  value: CachedPool,
  ttlMs = DEFAULT_TTL_MS,
): void {
  poolCache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function getInFlightDiscoveryPool(key: string): Promise<CachedPool> | undefined {
  return inFlight.get(key);
}

export function setInFlightDiscoveryPool(key: string, promise: Promise<CachedPool>): void {
  inFlight.set(key, promise);
  void promise.finally(() => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  });
}

export function clearDiscoveryPoolCache(): void {
  poolCache.clear();
  inFlight.clear();
}

export function getDiscoveryPoolCacheSize(): number {
  return poolCache.size;
}
