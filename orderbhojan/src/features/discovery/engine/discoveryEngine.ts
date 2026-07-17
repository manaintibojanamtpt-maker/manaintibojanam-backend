import type {
  DiscoveryCollectionId,
  DiscoveryHomeResponse,
  DiscoveryQueryParams,
} from '@/types/marketplace-discovery';
import { getDiscoveryApiClient } from '../infrastructure/discoveryApiClient';
import { writeDiscoverySessionCache } from './discoverySessionCache';

export {
  DEFAULT_DISCOVERY_COORDS,
  readPersistedActiveLocationCoords,
  resolveDiscoveryCoords,
} from '@/features/location/resolveDeliveryCoords';

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
