import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useActiveLocation } from '@/features/location';
import {
  resolveActiveDeliveryCoords,
  resolveActiveDeliveryLocation,
} from '@/features/location/domain/activeDeliveryLocation';
import { obDebugTrustEvent } from '@/lib/obDebug';
import { markPerf } from '@/lib/perfMarks';
import { loadDiscoveryHome } from '../engine/discoveryEngine';
import {
  getDiscoverySessionCacheUpdatedAt,
  readDiscoverySessionCache,
} from '../engine/discoverySessionCache';
import { discoveryKeys, DISCOVERY_GC_TIME_MS, DISCOVERY_STALE_TIME_MS } from './discoveryQueryKeys';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { useDiscoveryFeatureEnabled } from './useDiscoveryFeature';

export function useDiscoveryHome() {
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveActiveDeliveryCoords(activeLocation);
  const hasConfirmedCoords = coords != null;
  const deliveryLocation = resolveActiveDeliveryLocation(activeLocation);

  useEffect(() => {
    obDebugTrustEvent(
      'discovery',
      'useDiscoveryHome state',
      {
        enabled,
        hasConfirmedCoords,
        queryEnabled: enabled && hasConfirmedCoords,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        mode: deliveryLocation?.mode ?? null,
        isConfirmed: deliveryLocation?.isConfirmed ?? false,
        filters,
      },
      {
        locationMode: deliveryLocation?.mode ?? null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        isConfirmed: deliveryLocation?.isConfirmed ?? false,
      },
    );
  }, [
    coords?.lat,
    coords?.lng,
    deliveryLocation?.isConfirmed,
    deliveryLocation?.mode,
    enabled,
    filters,
    hasConfirmedCoords,
  ]);

  return useQuery({
    queryKey: hasConfirmedCoords
      ? discoveryKeys.home(coords.lat, coords.lng, filters)
      : [...discoveryKeys.all, 'home', 'unconfirmed', filters],
    queryFn: async () => {
      if (!coords) {
        throw new Error('Delivery location is required for discovery');
      }
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
    enabled: enabled && hasConfirmedCoords,
    staleTime: DISCOVERY_STALE_TIME_MS,
    gcTime: DISCOVERY_GC_TIME_MS,
    initialData: () =>
      coords ? readDiscoverySessionCache(coords.lat, coords.lng, filters) : undefined,
    initialDataUpdatedAt: () =>
      coords
        ? getDiscoverySessionCacheUpdatedAt(coords.lat, coords.lng, filters) ?? undefined
        : undefined,
    placeholderData: (previous) =>
      previous ?? (coords ? readDiscoverySessionCache(coords.lat, coords.lng, filters) : undefined),
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
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
    const hadPreviousCoords = previousCoordsRef.current != null;
    previousCoordsRef.current = key;
    if (!hadPreviousCoords) return;
    void queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
  }, [enabled, lat, lng, queryClient]);
}
