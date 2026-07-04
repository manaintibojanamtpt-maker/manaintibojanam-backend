import { getMarketplaceApiClient } from '@/marketplace-api';
import type {
  DiscoveryCollectionId,
  DiscoveryCollectionResponse,
  DiscoveryFilters,
  DiscoveryHomeResponse,
  DiscoveryQueryParams,
} from '@/types/marketplace-discovery';
import { serializeDiscoveryFilters } from '../domain/filters';

function baseQuery(params: DiscoveryQueryParams): Record<string, string | number | boolean> {
  return {
    lat: params.lat,
    lng: params.lng,
    page: params.page ?? 1,
    limit: params.limit ?? 6,
    ...serializeDiscoveryFilters(params.filters ?? {}),
  };
}

export class DiscoveryApiClient {
  fetchHome(params: DiscoveryQueryParams): Promise<DiscoveryHomeResponse> {
    return getMarketplaceApiClient().discoveryHome(baseQuery(params));
  }

  fetchCollection(
    collectionId: DiscoveryCollectionId,
    params: DiscoveryQueryParams,
  ): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryCollection(collectionId, baseQuery(params));
  }

  fetchNearby(params: DiscoveryQueryParams): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryNearby(baseQuery(params));
  }

  fetchFeatured(params: DiscoveryQueryParams): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryFeatured(baseQuery(params));
  }

  fetchTrending(params: DiscoveryQueryParams): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryTrending(baseQuery(params));
  }

  fetchCloudKitchens(params: DiscoveryQueryParams): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryCloudKitchens(baseQuery(params));
  }

  fetchTopRated(params: DiscoveryQueryParams): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryTopRated(baseQuery(params));
  }

  fetchOffers(params: DiscoveryQueryParams): Promise<DiscoveryCollectionResponse> {
    return getMarketplaceApiClient().discoveryOffers(baseQuery(params));
  }
}

let singleton: DiscoveryApiClient | null = null;

export function getDiscoveryApiClient(): DiscoveryApiClient {
  if (!singleton) {
    singleton = new DiscoveryApiClient();
  }
  return singleton;
}

export function resetDiscoveryApiClientForTests(): void {
  singleton = null;
}

export type { DiscoveryFilters, DiscoveryQueryParams };
