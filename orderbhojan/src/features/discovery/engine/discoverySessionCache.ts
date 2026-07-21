import type { PersistentSessionRecord } from '@/lib/persistentSessionStore';
import { readPersistentSessionRecord, writePersistentSessionRecord } from '@/lib/persistentSessionStore';
import type { DiscoveryFilters, DiscoveryHomeResponse } from '@/types/marketplace-discovery';

const STORAGE_KEY = 'ob-discovery-feed-v2';
const IDB_PREFIX = 'discovery:';
const SESSION_TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 8;

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
