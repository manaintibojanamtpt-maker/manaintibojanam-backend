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
    queryKey: searchKeys.suggestions(query, coords.lat, coords.lng),
    queryFn: () => loadSearchSuggestions({ ...coords, q: query }),
    enabled: enabled && query.length > 0,
    ...searchQuery,
    retry: 1,
  });
}
