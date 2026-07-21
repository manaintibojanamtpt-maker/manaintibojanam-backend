import type {
  SearchBrowseParams,
  SearchCollectionsResponse,
  MenuItemSearchResponse,
  SearchPlatformResponse,
  SearchQueryParams,
  SearchRecentResponse,
  SearchSuggestionsResponse,
  SearchTrendingResponse,
} from '@/types/marketplace-search';
import { resolveActiveDeliveryCoords } from '@/features/location/domain/activeDeliveryLocation';
import { passthroughSynonymAdapter, passthroughTypoAdapter } from '../domain/adapters';
import { trackSearchEvent } from '../analytics/searchAnalytics';
import { getSearchApiClient } from '../infrastructure/searchApiClient';

export function resolveSearchCoords(activeLocation?: import('@/features/location/domain/activeDeliveryLocation').ActiveDeliveryLocationInput): { lat: number; lng: number } | null {
  return resolveActiveDeliveryCoords(activeLocation);
}

function normalizeQuery(query: string): string {
  return passthroughTypoAdapter.normalize(query);
}

function expandQuery(query: string): readonly string[] {
  return passthroughSynonymAdapter.expand(normalizeQuery(query));
}

export async function executeSearch(params: SearchQueryParams): Promise<SearchPlatformResponse> {
  const normalized = normalizeQuery(params.q);
  const response = await getSearchApiClient().search({ ...params, q: normalized });

  if (response.meta.totalResults === 0) {
    trackSearchEvent('search_no_results', { query: normalized });
  } else {
    trackSearchEvent('search_submit', { query: normalized });
  }

  return response;
}

export async function executeMenuItemSearch(
  params: SearchQueryParams,
): Promise<MenuItemSearchResponse> {
  const normalized = normalizeQuery(params.q);
  const response = await getSearchApiClient().searchMenuItems({ ...params, q: normalized });

  if (response.meta.totalResults === 0) {
    trackSearchEvent('search_no_results', { query: normalized });
  } else {
    trackSearchEvent('search_submit', { query: normalized });
  }

  return response;
}

export async function loadSearchSuggestions(
  params: SearchBrowseParams & { q: string },
): Promise<SearchSuggestionsResponse> {
  const normalized = normalizeQuery(params.q);
  return getSearchApiClient().suggestions({ ...params, q: normalized });
}

export async function loadSearchBrowse(
  params: SearchBrowseParams,
): Promise<{
  trending: SearchTrendingResponse;
  recent: SearchRecentResponse;
  collections: SearchCollectionsResponse;
}> {
  const client = getSearchApiClient();
  const [trending, recent, collections] = await Promise.all([
    client.trending(params),
    client.recent(params),
    client.collections(params),
  ]);
  return { trending, recent, collections };
}

/** Future hook: semantic / AI ranking layer. */
export function rankSearchResults(response: SearchPlatformResponse): SearchPlatformResponse {
  return response;
}

export { expandQuery, normalizeQuery };
