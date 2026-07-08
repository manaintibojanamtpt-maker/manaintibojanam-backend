import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { loadDiscoveryHome, resolveDiscoveryCoords } from '../engine/discoveryEngine';
import { discoveryKeys } from './discoveryQueryKeys';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { useDiscoveryFeatureEnabled } from './useDiscoveryFeature';

export function useDiscoveryHome() {
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveDiscoveryCoords(activeLocation);
  const liveQuery = getMarketplaceQueryBehavior();

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
    ...liveQuery,
    retry: 2,
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
