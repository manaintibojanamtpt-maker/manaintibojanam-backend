import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useActiveLocation } from '@/features/location';
import { useLocationSessionStore } from '@/features/location/store/locationSessionStore';
import {
  resolveActiveDeliveryCoords,
  resolveActiveDeliveryLocation,
  readPersistedActiveLocationCoords,
} from '@/features/location/domain/activeDeliveryLocation';
import { homeHeroQueryKey } from '@/features/experience/hooks/useHomeHeroConfig';
import { obDebugTrustEvent } from '@/lib/obDebug';
import { markPerf } from '@/lib/perfMarks';
import { loadDiscoveryHome } from '../engine/discoveryEngine';
import {
  getDiscoverySessionCacheUpdatedAt,
  readDiscoverySessionCache,
  readNearestDiscoverySessionCache,
} from '../engine/discoverySessionCache';
import { discoveryKeys, DISCOVERY_GC_TIME_MS, DISCOVERY_STALE_TIME_MS } from './discoveryQueryKeys';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { useDiscoveryFeatureEnabled } from './useDiscoveryFeature';

/** Pure synchronous bootstrap coordinate resolver — no React deps, testable in node. */
// Module-level cache for referential stability (matches snapshotBootstrapCoords behavior).
let cachedResolvedBootstrapCoords: { lat: number; lng: number } | null = null;

export function resolveBootstrapCoords(): { lat: number; lng: number } | null {
  const persisted = readPersistedActiveLocationCoords();
  if (!persisted) {
    cachedResolvedBootstrapCoords = null;
    return null;
  }
  if (
    cachedResolvedBootstrapCoords &&
    cachedResolvedBootstrapCoords.lat === persisted.lat &&
    cachedResolvedBootstrapCoords.lng === persisted.lng
  ) {
    return cachedResolvedBootstrapCoords;
  }
  cachedResolvedBootstrapCoords = persisted;
  return persisted;
}

/**
 * Subscribe to location store rehydration for synchronous bootstrap coords.
 *
 * useSyncExternalStore compares getSnapshot results with Object.is, so the
 * snapshot MUST be referentially stable across calls that resolve to the same
 * coords — otherwise React loops forever. Cache the last object and reuse it
 * when lat/lng are unchanged.
 */
let cachedBootstrapCoords: { lat: number; lng: number } | null = null;

export function snapshotBootstrapCoords(): { lat: number; lng: number } | null {
  const next = resolveActiveDeliveryCoords(useLocationSessionStore.getState().activeLocation);
  if (!next) {
    cachedBootstrapCoords = null;
    return null;
  }
  if (
    cachedBootstrapCoords &&
    cachedBootstrapCoords.lat === next.lat &&
    cachedBootstrapCoords.lng === next.lng
  ) {
    return cachedBootstrapCoords;
  }
  cachedBootstrapCoords = next;
  return next;
}

export function useBootstrapCoords(): { lat: number; lng: number } | null {
  // eslint-disable-next-line react-hooks/rules-of-hooks -- useSyncExternalStore is a hook
  return useSyncExternalStore(
    useLocationSessionStore.subscribe,
    snapshotBootstrapCoords,
    resolveBootstrapCoords,
  );
}

export function useDiscoveryHome() {
  const queryClient = useQueryClient();
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  // Use bootstrap coords (sync from localStorage) for immediate cache lookup,
  // fall back to live coords once store rehydrates.
  const bootstrapCoords = useBootstrapCoords();
  const liveCoords = resolveActiveDeliveryCoords(activeLocation);
  const coords = liveCoords ?? bootstrapCoords;
  const hasConfirmedCoords = liveCoords != null;
  const deliveryLocation = resolveActiveDeliveryLocation(activeLocation);
  const heroRefreshedAfterDiscoveryRef = useRef(false);

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
        usedBootstrap: !hasConfirmedCoords && !!bootstrapCoords,
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
    bootstrapCoords,
  ]);

  const query = useQuery({
    queryKey: coords
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
    // Live backend discovery query must remain disabled until confirmed coordinates exist.
    // Cache reads still work with bootstrap coords via initialData.
    enabled: enabled && hasConfirmedCoords,
    staleTime: DISCOVERY_STALE_TIME_MS,
    gcTime: DISCOVERY_GC_TIME_MS,
    initialData: () =>
      coords
        ? readNearestDiscoverySessionCache(coords.lat, coords.lng, filters) ??
          readDiscoverySessionCache(coords.lat, coords.lng, filters)
        : undefined,
    initialDataUpdatedAt: () =>
      coords
        ? getDiscoverySessionCacheUpdatedAt(coords.lat, coords.lng, filters) ?? undefined
        : undefined,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });

  // After kitchens load, refresh Super Admin hero so Android does not stick on DEFAULT seed.
  useEffect(() => {
    if (!query.isSuccess || heroRefreshedAfterDiscoveryRef.current) return;
    heroRefreshedAfterDiscoveryRef.current = true;
    void queryClient.invalidateQueries({ queryKey: homeHeroQueryKey() });
  }, [query.isSuccess, queryClient]);

  return query;
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
