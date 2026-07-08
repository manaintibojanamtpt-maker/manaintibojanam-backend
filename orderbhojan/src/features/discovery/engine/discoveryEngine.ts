import type {
  DiscoveryCollectionId,
  DiscoveryFilters,
  DiscoveryHomeResponse,
  DiscoveryQueryParams,
} from '@/types/marketplace-discovery';
import { applyDiscoveryFilters } from '../domain/filters';
import { filtersForDiscoveryCollection } from '../domain/discoveryPolicy';
import { getDiscoveryApiClient } from '../infrastructure/discoveryApiClient';

/** Default Hyderabad coordinates when M2 location is unavailable. */
export const DEFAULT_DISCOVERY_COORDS = {
  lat: 17.4401,
  lng: 78.3489,
} as const;

export function resolveDiscoveryCoords(activeLocation?: {
  coordinates: { lat: number; lng: number };
} | null): { lat: number; lng: number } {
  if (activeLocation?.coordinates) {
    return {
      lat: activeLocation.coordinates.lat,
      lng: activeLocation.coordinates.lng,
    };
  }
  return { ...DEFAULT_DISCOVERY_COORDS };
}

export async function loadDiscoveryHome(
  params: DiscoveryQueryParams,
): Promise<DiscoveryHomeResponse> {
  const response = await getDiscoveryApiClient().fetchHome(params);
  return postProcessHome(response, params.filters);
}

export async function loadDiscoveryCollection(
  collectionId: DiscoveryCollectionId,
  params: DiscoveryQueryParams,
): Promise<DiscoveryHomeResponse['collections'][number]> {
  const response = await getDiscoveryApiClient().fetchCollection(collectionId, params);
  const collection = response.collection;
  if (!params.filters) return collection;
  return {
    ...collection,
    restaurants: applyDiscoveryFilters(collection.restaurants, params.filters),
  };
}

function postProcessHome(
  response: DiscoveryHomeResponse,
  filters?: DiscoveryFilters,
): DiscoveryHomeResponse {
  if (!filters) return response;
  return {
    ...response,
    collections: response.collections.map((collection) => ({
      ...collection,
      restaurants: applyDiscoveryFilters(
        collection.restaurants,
        filtersForDiscoveryCollection(collection.id, filters),
      ),
    })),
  };
}

/** Hook point for future ranking / personalization layers. */
export function rankCollectionRestaurants<T extends { restaurantId: string }>(
  restaurants: readonly T[],
): readonly T[] {
  return restaurants;
}
