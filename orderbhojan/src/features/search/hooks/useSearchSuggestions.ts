import { useQuery } from '@tanstack/react-query';
import { getSearchQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { loadSearchSuggestions, resolveSearchCoords } from '../engine/searchPlatform';
import {
  searchKeys,
  SEARCH_DEBOUNCE_MS,
} from './searchQueryKeys';
import { useDebouncedValue } from './useDebouncedValue';
import { useSearchFeatureEnabled } from './useSearchFeature';

export function useSearchSuggestions(rawQuery: string) {
  const enabled = useSearchFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveSearchCoords(activeLocation);
  const query = useDebouncedValue(rawQuery.trim(), SEARCH_DEBOUNCE_MS);
  const searchQuery = getSearchQueryBehavior();

  return useQuery({
    queryKey: coords
      ? searchKeys.suggestions(query, coords.lat, coords.lng)
      : [...searchKeys.all, 'suggestions', query, 'unconfirmed'],
    queryFn: () => {
      if (!coords) throw new Error('Delivery location is required for search');
      return loadSearchSuggestions({ ...coords, q: query });
    },
    enabled: enabled && query.length > 0 && coords != null,
    ...searchQuery,
    retry: 1,
  });
}
