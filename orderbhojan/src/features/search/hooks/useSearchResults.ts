import { useQuery } from '@tanstack/react-query';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { executeSearch, resolveSearchCoords } from '../engine/searchPlatform';
import {
  searchKeys,
  SEARCH_DEBOUNCE_MS,
} from './searchQueryKeys';
import { useDebouncedValue } from './useDebouncedValue';
import { useSearchFeatureEnabled } from './useSearchFeature';
import { useSearchFilterStore } from '../store/searchStore';

export function useSearchResults(rawQuery: string) {
  const enabled = useSearchFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useSearchFilterStore((s) => s.filters);
  const coords = resolveSearchCoords(activeLocation);
  const query = useDebouncedValue(rawQuery.trim(), SEARCH_DEBOUNCE_MS);
  const hasQuery = query.length > 0;
  const liveQuery = getMarketplaceQueryBehavior();

  return useQuery({
    queryKey: searchKeys.results(query, coords.lat, coords.lng, filters),
    queryFn: () =>
      executeSearch({
        q: query,
        lat: coords.lat,
        lng: coords.lng,
        filters,
      }),
    enabled: enabled && hasQuery,
    ...liveQuery,
    retry: 2,
    placeholderData: (previous) => previous,
  });
}
