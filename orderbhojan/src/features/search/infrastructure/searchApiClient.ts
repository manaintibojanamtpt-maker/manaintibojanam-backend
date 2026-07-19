import { getMarketplaceApiClient } from '@/marketplace-api';
import type {
  SearchBrowseParams,
  MenuItemSearchResponse,
  SearchCollectionsResponse,
  SearchPlatformResponse,
  SearchQueryParams,
  SearchRecentResponse,
  SearchSuggestionsResponse,
  SearchTrendingResponse,
} from '@/types/marketplace-search';
import { serializeSearchFilters } from '../domain/filters';

function baseQuery(
  params: SearchQueryParams | SearchBrowseParams,
): Record<string, string | number | boolean> {
  return {
    lat: params.lat,
    lng: params.lng,
  };
}

export class SearchApiClient {
  search(params: SearchQueryParams): Promise<SearchPlatformResponse> {
    return getMarketplaceApiClient().searchPlatform({
      q: params.q,
      ...baseQuery(params),
      limit: params.limit ?? 8,
      ...serializeSearchFilters(params.filters ?? {}),
    });
  }

  searchMenuItems(params: SearchQueryParams): Promise<MenuItemSearchResponse> {
    return getMarketplaceApiClient().searchMenuItems({
      q: params.q,
      ...baseQuery(params),
      limit: params.limit ?? 12,
      ...serializeSearchFilters(params.filters ?? {}),
    });
  }

  suggestions(params: SearchBrowseParams & { q: string }): Promise<SearchSuggestionsResponse> {
    return getMarketplaceApiClient().searchSuggestions({
      q: params.q,
      ...baseQuery(params),
    });
  }

  trending(params: SearchBrowseParams): Promise<SearchTrendingResponse> {
    return getMarketplaceApiClient().searchTrending(baseQuery(params));
  }

  recent(params: SearchBrowseParams): Promise<SearchRecentResponse> {
    return getMarketplaceApiClient().searchRecent(baseQuery(params));
  }

  collections(params: SearchBrowseParams): Promise<SearchCollectionsResponse> {
    return getMarketplaceApiClient().searchCollections(baseQuery(params));
  }
}

let singleton: SearchApiClient | null = null;

export function getSearchApiClient(): SearchApiClient {
  if (!singleton) singleton = new SearchApiClient();
  return singleton;
}

export function resetSearchApiClientForTests(): void {
  singleton = null;
}
