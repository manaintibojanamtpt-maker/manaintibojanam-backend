import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSearchQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import {
  filterLocalMenuItems,
  menuItemsToSuggestions,
} from '../domain/localMenuItemSearch';
import { withSearchClientTimeout } from '../engine/searchClientTimeout';
import { executeMenuItemSearch, resolveSearchCoords } from '../engine/searchPlatform';
import {
  getCachedMenuItemsForSearch,
  mergeMenuItemsIntoSearchCache,
} from '../store/searchMenuCacheStore';
import { searchKeys, SEARCH_SUGGESTIONS_DEBOUNCE_MS } from './searchQueryKeys';
import { useDebouncedValue } from './useDebouncedValue';
import { useSearchFeatureEnabled } from './useSearchFeature';
import type { SearchSuggestion } from '@/types/marketplace-search';

function resolveLocalSuggestions(rawQuery: string, limit: number): readonly SearchSuggestion[] {
  if (!rawQuery.trim()) return [];
  const localItems = filterLocalMenuItems(rawQuery.trim(), getCachedMenuItemsForSearch(), limit);
  return menuItemsToSuggestions(localItems);
}

export function useMenuItemSearchSuggestions(rawQuery: string, limit = 8) {
  const enabled = useSearchFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveSearchCoords(activeLocation);
  const query = useDebouncedValue(rawQuery.trim(), SEARCH_SUGGESTIONS_DEBOUNCE_MS);
  const hasQuery = query.length > 0;
  const searchQuery = getSearchQueryBehavior();

  const localSuggestions = useMemo(
    () => resolveLocalSuggestions(rawQuery, limit),
    [limit, rawQuery],
  );

  const apiQuery = useQuery<SearchSuggestion[]>({
    queryKey: coords
      ? ([...searchKeys.all, 'menu-suggestions', query, coords.lat, coords.lng, limit] as const)
      : ([...searchKeys.all, 'menu-suggestions', query, 'unconfirmed', limit] as const),
    queryFn: async () => {
      if (!coords) throw new Error('Delivery location is required for search');
      const localItems = filterLocalMenuItems(query, getCachedMenuItemsForSearch(), limit);
      try {
        const response = await withSearchClientTimeout(
          executeMenuItemSearch({
            q: query,
            lat: coords.lat,
            lng: coords.lng,
            limit,
          }),
        );
        mergeMenuItemsIntoSearchCache(response.items);
        return [...menuItemsToSuggestions(response.items)];
      } catch {
        return [...menuItemsToSuggestions(localItems)];
      }
    },
    enabled: enabled && hasQuery && coords != null,
    ...searchQuery,
    retry: 0,
    placeholderData: (previous) => {
      if (previous?.length) return previous;
      if (localSuggestions.length === 0) return undefined;
      return [...localSuggestions];
    },
  });

  const suggestions = useMemo((): readonly SearchSuggestion[] => {
    if (apiQuery.data?.length) return apiQuery.data;
    return localSuggestions;
  }, [apiQuery.data, localSuggestions]);

  const isFetching = apiQuery.isFetching && suggestions.length === 0;

  return {
    suggestions,
    isFetching,
    isError: apiQuery.isError && suggestions.length === 0,
  };
}
