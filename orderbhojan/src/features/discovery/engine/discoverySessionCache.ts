import type { DiscoveryFilters, DiscoveryHomeResponse } from '@/types/marketplace-discovery';

const STORAGE_KEY = 'ob-discovery-feed-v1';
const SESSION_TTL_MS = 30 * 60_000;

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 8)));
  } catch {
    // Quota or private mode — ignore.
  }
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
  const rest = readAllEntries().filter(
    (existing) =>
      !(
        coordsMatch(existing.lat, existing.lng, lat, lng) &&
        filtersMatch(existing.filters, filters)
      ),
  );
  writeAllEntries([entry, ...rest]);
}

export function clearDiscoverySessionCacheForTests(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
