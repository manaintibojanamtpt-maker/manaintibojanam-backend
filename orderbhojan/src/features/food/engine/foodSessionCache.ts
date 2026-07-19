import type { PersistentSessionRecord } from '@/lib/persistentSessionStore';
import { readPersistentSessionRecord, writePersistentSessionRecord } from '@/lib/persistentSessionStore';
import type { FoodMenuResponse } from '@/types/marketplace-food';

const STORAGE_KEY = 'ob-food-menu-v1';
const IDB_PREFIX = 'food:';
const SESSION_TTL_MS = 30 * 60_000;
const MAX_ENTRIES = 12;

interface FoodSessionEntry {
  readonly slug: string;
  readonly lat: number;
  readonly lng: number;
  readonly data: FoodMenuResponse;
  readonly fetchedAt: number;
}

function coordsMatch(aLat: number, aLng: number, bLat: number, bLng: number): boolean {
  return aLat.toFixed(3) === bLat.toFixed(3) && aLng.toFixed(3) === bLng.toFixed(3);
}

function foodCacheKey(slug: string, lat: number, lng: number): string {
  return `${IDB_PREFIX}${slug}:${lat.toFixed(3)}:${lng.toFixed(3)}`;
}

function readAllEntries(): FoodSessionEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FoodSessionEntry[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((entry) => now - entry.fetchedAt <= SESSION_TTL_MS);
  } catch {
    return [];
  }
}

function writeAllEntries(entries: FoodSessionEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // Quota or private mode — ignore.
  }
}

function upsertLocalEntry(entry: FoodSessionEntry): void {
  const rest = readAllEntries().filter(
    (existing) =>
      !(
        existing.slug === entry.slug &&
        coordsMatch(existing.lat, existing.lng, entry.lat, entry.lng)
      ),
  );
  writeAllEntries([entry, ...rest]);
}

function entryFromRecord(record: PersistentSessionRecord): FoodSessionEntry | null {
  try {
    const parsed = JSON.parse(record.payload) as FoodSessionEntry;
    if (!parsed?.data || typeof parsed.slug !== 'string') return null;
    return { ...parsed, fetchedAt: record.fetchedAt };
  } catch {
    return null;
  }
}

export function readFoodSessionCache(
  slug: string,
  lat: number,
  lng: number,
): FoodMenuResponse | undefined {
  const match = readAllEntries().find(
    (entry) => entry.slug === slug && coordsMatch(entry.lat, entry.lng, lat, lng),
  );
  return match?.data;
}

export function getFoodSessionCacheUpdatedAt(
  slug: string,
  lat: number,
  lng: number,
): number | undefined {
  const match = readAllEntries().find(
    (entry) => entry.slug === slug && coordsMatch(entry.lat, entry.lng, lat, lng),
  );
  return match?.fetchedAt;
}

export function writeFoodSessionCache(
  slug: string,
  lat: number,
  lng: number,
  data: FoodMenuResponse,
): void {
  const entry: FoodSessionEntry = { slug, lat, lng, data, fetchedAt: Date.now() };
  upsertLocalEntry(entry);

  void writePersistentSessionRecord({
    key: foodCacheKey(slug, lat, lng),
    payload: JSON.stringify(entry),
    fetchedAt: entry.fetchedAt,
  });
}

export async function hydrateFoodSessionCacheFromIdb(slug: string, lat: number, lng: number): Promise<void> {
  if (readFoodSessionCache(slug, lat, lng)) return;

  const record = await readPersistentSessionRecord(foodCacheKey(slug, lat, lng), SESSION_TTL_MS);
  const entry = record ? entryFromRecord(record) : null;
  if (entry) upsertLocalEntry(entry);
}

export function clearFoodSessionCacheForTests(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function clearFoodSessionCacheForSlug(slug: string): void {
  const filtered = readAllEntries().filter((entry) => entry.slug !== slug);
  writeAllEntries(filtered);
}
