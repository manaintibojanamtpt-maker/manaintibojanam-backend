import type { PersistentSessionRecord } from '@/lib/persistentSessionStore';
import { readPersistentSessionRecord, writePersistentSessionRecord } from '@/lib/persistentSessionStore';
import type { DiscoveryFilters, DiscoveryHomeResponse } from '@/types/marketplace-discovery';

const STORAGE_KEY = 'ob-discovery-feed-v2';
const IDB_PREFIX = 'discovery:';
const SESSION_TTL_MS = 60 * 60_000;
const MAX_ENTRIES = 12;

interface DiscoverySessionEntry {
  readonly lat: number;
  readonly lng: number;
  readonly filters: DiscoveryFilters;
  readonly data: DiscoveryHomeResponse;
  readonly fetchedAt: number;
}

function coordsMatch(aLat: number, aLng: number, bLat: number, bLng: number): boolean {
  return aLat.toFixed(3) === bLat.toFixed(3) && aLng.toFixed(3) === bLng.toFixed(3);
}

function filtersMatch(a: DiscoveryFilters, b: DiscoveryFilters): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function discoveryCacheKey(lat: number, lng: number, filters: DiscoveryFilters): string {
  return `${IDB_PREFIX}${lat.toFixed(3)}:${lng.toFixed(3)}:${JSON.stringify(filters)}`;
}

function entryFromRecord(record: PersistentSessionRecord): DiscoverySessionEntry | null {
  try {
    const parsed = JSON.parse(record.payload) as DiscoverySessionEntry;
    if (!parsed?.data || typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null;
    return { ...parsed, fetchedAt: record.fetchedAt };
  } catch {
    return null;
  }
}

export function listDiscoverySessionCacheEntries(): readonly DiscoverySessionEntry[] {
  return readAllEntries();
}

function readAllEntries(): DiscoverySessionEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiscoverySessionEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((entry) => now - entry.fetchedAt <= SESSION_TTL_MS);
  } catch {
    return [];
  }
}

function writeAllEntries(entries: DiscoverySessionEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota or private mode — ignore.
  }
}

function upsertLocalEntry(entry: DiscoverySessionEntry): void {
  const rest = readAllEntries().filter(
    (existing) =>
      !(
        coordsMatch(existing.lat, existing.lng, entry.lat, entry.lng) &&
        filtersMatch(existing.filters, entry.filters)
      ),
  );
  writeAllEntries([entry, ...rest]);
}

export function readDiscoverySessionCache(
  lat: number,
  lng: number,
  filters: DiscoveryFilters = {},
): DiscoveryHomeResponse | undefined {
  const match = readAllEntries().find(
    (entry) => coordsMatch(entry.lat, entry.lng, lat, lng) && filtersMatch(entry.filters, filters),
  );
  return match?.data;
}

/** Approximate Haversine km — used only for stale-while-revalidate nearest cache. */
function approxDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Instant first paint: prefer exact coords, else nearest prior feed within maxKm
 * (Zomato-style — show kitchens immediately, refresh in background).
 */
export function readNearestDiscoverySessionCache(
  lat: number,
  lng: number,
  filters: DiscoveryFilters = {},
  maxKm = 2.5,
): DiscoveryHomeResponse | undefined {
  const exact = readDiscoverySessionCache(lat, lng, filters);
  if (exact) return exact;

  let best: DiscoverySessionEntry | null = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const entry of readAllEntries()) {
    if (!filtersMatch(entry.filters, filters)) continue;
    const km = approxDistanceKm(lat, lng, entry.lat, entry.lng);
    if (km <= maxKm && km < bestKm) {
      best = entry;
      bestKm = km;
    }
  }
  return best?.data;
}

export function getDiscoverySessionCacheUpdatedAt(
  lat: number,
  lng: number,
  filters: DiscoveryFilters = {},
): number | undefined {
  const match = readAllEntries().find(
    (entry) => coordsMatch(entry.lat, entry.lng, lat, lng) && filtersMatch(entry.filters, filters),
  );
  return match?.fetchedAt;
}

export function writeDiscoverySessionCache(
  lat: number,
  lng: number,
  filters: DiscoveryFilters,
  data: DiscoveryHomeResponse,
): void {
  const entry: DiscoverySessionEntry = { lat, lng, filters, data, fetchedAt: Date.now() };
  upsertLocalEntry(entry);

  void writePersistentSessionRecord({
    key: discoveryCacheKey(lat, lng, filters),
    payload: JSON.stringify(entry),
    fetchedAt: entry.fetchedAt,
  });
}

/** Promote IndexedDB hit into localStorage for bootstrap coords before first paint. */
export async function hydrateDiscoverySessionCacheFromIdb(
  lat: number,
  lng: number,
  filters: DiscoveryFilters = {},
): Promise<void> {
  const local = readDiscoverySessionCache(lat, lng, filters);
  if (local) return;

  const record = await readPersistentSessionRecord(discoveryCacheKey(lat, lng, filters), SESSION_TTL_MS);
  const entry = record ? entryFromRecord(record) : null;
  if (entry) upsertLocalEntry(entry);
}

export function clearDiscoverySessionCacheForTests(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
