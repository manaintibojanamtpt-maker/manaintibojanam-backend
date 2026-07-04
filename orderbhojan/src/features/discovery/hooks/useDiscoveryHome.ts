import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useActiveLocation } from '@/features/location';
import { loadDiscoveryHome, resolveDiscoveryCoords } from '../engine/discoveryEngine';
import { discoveryKeys, DISCOVERY_GC_TIME_MS, DISCOVERY_STALE_TIME_MS } from './discoveryQueryKeys';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { useDiscoveryFeatureEnabled } from './useDiscoveryFeature';

export function useDiscoveryHome() {
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveDiscoveryCoords(activeLocation);

  return useQuery({
    queryKey: discoveryKeys.home(coords.lat, coords.lng, filters),
    queryFn: () =>
      loadDiscoveryHome({
        lat: coords.lat,
        lng: coords.lng,
        page: 1,
        limit: 6,
        filters,
      }),
    enabled,
    staleTime: DISCOVERY_STALE_TIME_MS,
    gcTime: DISCOVERY_GC_TIME_MS,
    retry: 2,
    placeholderData: (previous) => previous,
  });
}

/** Invalidates discovery cache when customer location changes. */
export function useDiscoveryLocationInvalidation() {
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const enabled = useDiscoveryFeatureEnabled();
  const lat = activeLocation?.coordinates.lat;
  const lng = activeLocation?.coordinates.lng;

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    void queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
  }, [enabled, lat, lng, queryClient]);
}
