import type { SearchFilters } from '@/types/marketplace-search';

export const searchKeys = {
  all: ['search'] as const,
  browse: (lat: number, lng: number) => [...searchKeys.all, 'browse', lat, lng] as const,
  results: (q: string, lat: number, lng: number, filters: SearchFilters) =>
    [...searchKeys.all, 'results', q, lat, lng, filters] as const,
  suggestions: (q: string, lat: number, lng: number) =>
    [...searchKeys.all, 'suggestions', q, lat, lng] as const,
};

export const SEARCH_STALE_TIME_MS = 60_000;
export const SEARCH_GC_TIME_MS = 5 * 60_000;
export const SEARCH_DEBOUNCE_MS = 280;
export const SEARCH_SUGGESTIONS_DEBOUNCE_MS = 150;
/** Client-side cap so autocomplete falls back to local cache instead of hanging. */
export const SEARCH_CLIENT_TIMEOUT_MS = 4_500;
