import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSearchQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { filterLocalMenuItems } from '../domain/localMenuItemSearch';
import { withSearchClientTimeout } from '../engine/searchClientTimeout';
import { executeMenuItemSearch, resolveSearchCoords } from '../engine/searchPlatform';
import {
  getCachedMenuItemsForSearch,
  mergeMenuItemsIntoSearchCache,
} from '../store/searchMenuCacheStore';
import { useSearchFilterStore } from '../store/searchStore';
import { searchKeys, SEARCH_DEBOUNCE_MS } from './searchQueryKeys';
import { useDebouncedValue } from './useDebouncedValue';
import { useSearchFeatureEnabled } from './useSearchFeature';

export function useMenuItemSearch(rawQuery: string, limit = 12) {
  const enabled = useSearchFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useSearchFilterStore((s) => s.filters);
  const coords = resolveSearchCoords(activeLocation);
  const query = useDebouncedValue(rawQuery.trim(), SEARCH_DEBOUNCE_MS);
  const hasQuery = query.length > 0;
  const searchQuery = getSearchQueryBehavior();

  const optimisticItems = useMemo(() => {
    if (!hasQuery) return [];
    return filterLocalMenuItems(rawQuery.trim(), getCachedMenuItemsForSearch(), limit);
  }, [hasQuery, limit, rawQuery]);

  const result = useQuery({
    queryKey: coords
      ? ([...searchKeys.all, 'menu-items', query, coords.lat, coords.lng, filters, limit] as const)
      : ([...searchKeys.all, 'menu-items', query, 'unconfirmed', filters, limit] as const),
    queryFn: async () => {
      if (!coords) throw new Error('Delivery location is required for search');
      const localItems = filterLocalMenuItems(query, getCachedMenuItemsForSearch(), limit);
      try {
        return await withSearchClientTimeout(
          executeMenuItemSearch({
            q: query,
            lat: coords.lat,
            lng: coords.lng,
            limit,
            filters,
          }),
        );
      } catch {
        return {
          query,
          items: localItems,
          meta: {
            provider: 'local-cache',
            totalResults: localItems.length,
            tookMs: 0,
          },
        };
      }
    },
    enabled: enabled && hasQuery && coords != null,
    ...searchQuery,
    retry: 0,
    placeholderData: (previous) => {
      if (previous) return previous;
      if (optimisticItems.length === 0) return undefined;
      return {
        query,
        items: optimisticItems,
        meta: {
          provider: 'local-cache',
          totalResults: optimisticItems.length,
          tookMs: 0,
        },
      };
    },
  });

  useEffect(() => {
    if (!result.data?.items.length) return;
    mergeMenuItemsIntoSearchCache(result.data.items);
  }, [result.data?.items]);

  return result;
}
