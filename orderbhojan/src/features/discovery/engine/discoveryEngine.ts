import type {
  DiscoveryCollectionId,
  DiscoveryHomeResponse,
  DiscoveryQueryParams,
} from '@/types/marketplace-discovery';
import { DEFAULT_MARKETPLACE_COORDS } from '@/lib/marketplaceDefaults';
import { getDiscoveryApiClient } from '../infrastructure/discoveryApiClient';
import { writeDiscoverySessionCache } from './discoverySessionCache';

/** @deprecated Use DEFAULT_MARKETPLACE_COORDS from @/lib/marketplaceDefaults */
export const DEFAULT_DISCOVERY_COORDS = DEFAULT_MARKETPLACE_COORDS;

const LOCATION_SESSION_STORAGE_KEY = 'ob-location-session-v1';

const inFlightHome = new Map<string, Promise<DiscoveryHomeResponse>>();

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
    return { lat: coords.lat, lng: coords.lng };
  } catch {
    return null;
  }
}

function discoveryRequestKey(params: DiscoveryQueryParams): string {
  const filters = params.filters ?? {};
  return `${params.lat.toFixed(3)}:${params.lng.toFixed(3)}:${JSON.stringify(filters)}`;
}

export function resolveDiscoveryCoords(activeLocation?: {
  coordinates: { lat: number; lng: number };
} | null): { lat: number; lng: number } {
  if (activeLocation?.coordinates) {
    return {
      lat: activeLocation.coordinates.lat,
      lng: activeLocation.coordinates.lng,
    };
  }
  const persisted = readPersistedActiveLocationCoords();
  if (persisted) return persisted;
  return { ...DEFAULT_DISCOVERY_COORDS };
}

export async function loadDiscoveryHome(
  params: DiscoveryQueryParams,
): Promise<DiscoveryHomeResponse> {
  const key = discoveryRequestKey(params);
  const existing = inFlightHome.get(key);
  if (existing) return existing;

  const promise = getDiscoveryApiClient()
    .fetchHome(params)
    .then((result) => {
      writeDiscoverySessionCache(params.lat, params.lng, params.filters ?? {}, result);
      return result;
    })
    .finally(() => {
      if (inFlightHome.get(key) === promise) {
        inFlightHome.delete(key);
      }
    });

  inFlightHome.set(key, promise);
  return promise;
}

export async function loadDiscoveryCollection(
  collectionId: DiscoveryCollectionId,
  params: DiscoveryQueryParams,
): Promise<DiscoveryHomeResponse['collections'][number]> {
  const response = await getDiscoveryApiClient().fetchCollection(collectionId, params);
  return response.collection;
}

/** Hook point for future ranking / personalization layers. */
export function rankCollectionRestaurants<T extends { restaurantId: string }>(
  restaurants: readonly T[],
): readonly T[] {
  return restaurants;
}
