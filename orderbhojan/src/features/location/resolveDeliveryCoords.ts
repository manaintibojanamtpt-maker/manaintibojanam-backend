import { hydrateObLocationFromV2 } from '@/features/location/unifiedLocationSync';
import { DEFAULT_MARKETPLACE_COORDS } from '@/lib/marketplaceDefaults';

const LOCATION_SESSION_STORAGE_KEY = 'ob-location-session-v1';

/** @deprecated Use DEFAULT_MARKETPLACE_COORDS from @/lib/marketplaceDefaults */
export const DEFAULT_DISCOVERY_COORDS = DEFAULT_MARKETPLACE_COORDS;

function isUsableCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/** Sync read before zustand persist rehydrates — matches bootstrap warm-start coords. */
export function readPersistedActiveLocationCoords(): { lat: number; lng: number } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCATION_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      state?: { activeLocation?: { coordinates?: { lat?: number; lng?: number } } | null };
    };
    const coords = parsed.state?.activeLocation?.coordinates;
    if (typeof coords?.lat !== 'number' || typeof coords?.lng !== 'number') return null;
    if (!isUsableCoord(coords.lat, coords.lng)) return null;
    return { lat: coords.lat, lng: coords.lng };
  } catch {
    return null;
  }
}

/** Single source for marketplace API lat/lng — session, V2 store, then Pune fallback. */
export function resolveDeliveryCoords(activeLocation?: {
  coordinates: { lat: number; lng: number };
} | null): { lat: number; lng: number } {
  if (activeLocation?.coordinates) {
    const { lat, lng } = activeLocation.coordinates;
    if (isUsableCoord(lat, lng)) return { lat, lng };
  }

  const persisted = readPersistedActiveLocationCoords();
  if (persisted) return persisted;

  const fromV2 = hydrateObLocationFromV2();
  if (fromV2?.coordinates && isUsableCoord(fromV2.coordinates.lat, fromV2.coordinates.lng)) {
    return { lat: fromV2.coordinates.lat, lng: fromV2.coordinates.lng };
  }

  return { ...DEFAULT_MARKETPLACE_COORDS };
}

/** @deprecated Use resolveDeliveryCoords */
export const resolveDiscoveryCoords = resolveDeliveryCoords;

/** @deprecated Use resolveDeliveryCoords */
export const resolveRestaurantCoords = resolveDeliveryCoords;
