import type { GuestLocationPersisted } from '../domain/location.types';

const STORAGE_KEY = 'ob_guest_location_v1';
const RECENT_KEY = 'ob_recent_locations_v1';
const MAX_RECENT = 5;
const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function readGuestLocation(): GuestLocationPersisted | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestLocationPersisted & { savedAt?: string };
    if (parsed.version !== 1) return null;
    if (parsed.savedAt && Date.now() - new Date(parsed.savedAt).getTime() > GUEST_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestLocation(value: GuestLocationPersisted): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...value, savedAt: new Date().toISOString() }));
}

export function clearGuestLocation(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export interface RecentLocationPersisted {
  readonly version: 1;
  readonly entries: { id: string; displayLabel: string; coordinates: GuestLocationPersisted['coordinates']; usedAt: string }[];
}

export function readRecentLocations(): RecentLocationPersisted['entries'] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentLocationPersisted;
    return parsed.version === 1 ? parsed.entries : [];
  } catch {
    return [];
  }
}

export function pushRecentLocation(displayLabel: string, coordinates: GuestLocationPersisted['coordinates']): void {
  if (typeof window === 'undefined') return;
  const entries = readRecentLocations().filter((e) => e.displayLabel !== displayLabel);
  entries.unshift({
    id: crypto.randomUUID(),
    displayLabel,
    coordinates,
    usedAt: new Date().toISOString(),
  });
  const payload: RecentLocationPersisted = { version: 1, entries: entries.slice(0, MAX_RECENT) };
  localStorage.setItem(RECENT_KEY, JSON.stringify(payload));
}
