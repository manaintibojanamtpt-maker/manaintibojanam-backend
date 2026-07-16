import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useActiveLocation } from '@/features/location';
import { markPerf } from '@/lib/perfMarks';
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
    queryFn: async () => {
      markPerf('discovery_fetch_start');
      const result = await loadDiscoveryHome({
        lat: coords.lat,
        lng: coords.lng,
        page: 1,
        limit: 24,
        filters,
      });
      markPerf('discovery_fetch_end');
      return result;
    },
    enabled,
    staleTime: DISCOVERY_STALE_TIME_MS,
    gcTime: DISCOVERY_GC_TIME_MS,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    refetchInterval: false,
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
  const previousCoordsRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (previousCoordsRef.current === key) return;
    previousCoordsRef.current = key;
    void queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
  }, [enabled, lat, lng, queryClient]);
}
