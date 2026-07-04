import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useActiveLocation } from '@/features/location';
import { loadSearchBrowse, resolveSearchCoords } from '../engine/searchPlatform';
import { searchKeys, SEARCH_GC_TIME_MS, SEARCH_STALE_TIME_MS } from './searchQueryKeys';
import { useSearchFeatureEnabled } from './useSearchFeature';

export function useSearchBrowse() {
  const enabled = useSearchFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveSearchCoords(activeLocation);

  return useQuery({
    queryKey: searchKeys.browse(coords.lat, coords.lng),
    queryFn: () => loadSearchBrowse(coords),
    enabled,
    staleTime: SEARCH_STALE_TIME_MS,
    gcTime: SEARCH_GC_TIME_MS,
    retry: 2,
    placeholderData: (previous) => previous,
  });
}

export function useSearchLocationInvalidation() {
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const enabled = useSearchFeatureEnabled();
  const lat = activeLocation?.coordinates.lat;
  const lng = activeLocation?.coordinates.lng;

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    void queryClient.invalidateQueries({ queryKey: searchKeys.all });
  }, [enabled, lat, lng, queryClient]);
}
