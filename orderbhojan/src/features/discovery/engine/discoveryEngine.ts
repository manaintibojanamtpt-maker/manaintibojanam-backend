import type {
  DiscoveryCollectionId,
  DiscoveryHomeResponse,
  DiscoveryQueryParams,
} from '@/types/marketplace-discovery';
import { obDebugTrustEvent } from '@/lib/obDebug';
import { getDiscoveryApiClient } from '../infrastructure/discoveryApiClient';
import { writeDiscoverySessionCache } from './discoverySessionCache';

function readOptionalExcludedKitchenCount(result: DiscoveryHomeResponse): number | null {
  const meta = (result as DiscoveryHomeResponse & {
    meta?: { excludedKitchenCount?: number; excludedCount?: number };
    excludedKitchenCount?: number;
  }).meta;
  const direct = (result as DiscoveryHomeResponse & { excludedKitchenCount?: number })
    .excludedKitchenCount;
  const fromMeta = meta?.excludedKitchenCount ?? meta?.excludedCount;
  const value = direct ?? fromMeta;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function countShownKitchens(result: DiscoveryHomeResponse): number {
  const ids = new Set<string>();
  for (const collection of result.collections) {
    for (const restaurant of collection.restaurants) {
      ids.add(restaurant.restaurantId);
    }
  }
  return ids.size;
}

export {
  readPersistedActiveLocationCoords,
  resolveDiscoveryCoords,
} from '@/features/location/resolveDeliveryCoords';
export {
  resolveActiveDeliveryLocation,
  resolveActiveDeliveryCoords,
} from '@/features/location/domain/activeDeliveryLocation';

const inFlightHome = new Map<string, Promise<DiscoveryHomeResponse>>();

function discoveryRequestKey(params: DiscoveryQueryParams): string {
  const filters = params.filters ?? {};
  return `${params.lat.toFixed(3)}:${params.lng.toFixed(3)}:${JSON.stringify(filters)}`;
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
      const shownKitchens = countShownKitchens(result);
      const excludedKitchens = readOptionalExcludedKitchenCount(result);
      obDebugTrustEvent(
        'discovery',
        'loadDiscoveryHome response',
        {
          lat: params.lat,
          lng: params.lng,
          shownKitchens,
          excludedKitchens,
          collectionCount: result.collections.length,
          locationLabel: result.locationLabel ?? null,
        },
        {
          lat: params.lat,
          lng: params.lng,
          shownKitchens,
          excludedKitchens,
        },
      );
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
