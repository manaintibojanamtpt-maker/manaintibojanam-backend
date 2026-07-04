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
