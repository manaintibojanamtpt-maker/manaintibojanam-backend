import { DEFAULT_MARKETPLACE_COORDS } from '@/lib/marketplaceDefaults';
import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { markPerf } from '@/lib/perfMarks';
import { queryClient } from '@/shared/queryClient';
import { hydrateObLocationFromV2 } from '@/features/location/unifiedLocationSync';
import {
  loadDiscoveryHome,
  readPersistedActiveLocationCoords,
  resolveDiscoveryCoords,
} from './discoveryEngine';
import { discoveryKeys, DISCOVERY_STALE_TIME_MS } from '../hooks/discoveryQueryKeys';
import {
  getDiscoverySessionCacheUpdatedAt,
  listDiscoverySessionCacheEntries,
  readDiscoverySessionCache,
} from './discoverySessionCache';

const DEFAULT_FILTERS = {};

/** Resolve delivery coords synchronously before React / zustand rehydration. */
export function resolveBootstrapDiscoveryCoords(): { lat: number; lng: number } {
  const persisted = readPersistedActiveLocationCoords();
  if (persisted) return persisted;

  const fromV2 = hydrateObLocationFromV2();
  if (fromV2) return resolveDiscoveryCoords(fromV2);

  const latestSessionEntry = listDiscoverySessionCacheEntries()[0];
  if (latestSessionEntry) {
    return { lat: latestSessionEntry.lat, lng: latestSessionEntry.lng };
  }

  return { ...DEFAULT_MARKETPLACE_COORDS };
}

export function seedDiscoveryQueryCacheFromSession(): void {
  for (const entry of listDiscoverySessionCacheEntries()) {
    queryClient.setQueryData(
      discoveryKeys.home(entry.lat, entry.lng, entry.filters),
      entry.data,
      { updatedAt: entry.fetchedAt },
    );
  }

  const coords = resolveBootstrapDiscoveryCoords();
  const cached = readDiscoverySessionCache(coords.lat, coords.lng, DEFAULT_FILTERS);
  if (!cached) return;

  queryClient.setQueryData(
    discoveryKeys.home(coords.lat, coords.lng, DEFAULT_FILTERS),
    cached,
    {
      updatedAt:
        getDiscoverySessionCacheUpdatedAt(coords.lat, coords.lng, DEFAULT_FILTERS) ?? Date.now(),
    },
  );
}

export function warmDiscoveryHome(
  lat: number,
  lng: number,
  filters: Record<string, never> = DEFAULT_FILTERS,
  source: 'bootstrap' | 'provider' = 'bootstrap',
): void {
  if (!isFeatureEnabled(loadFeatureFlags(), 'FF_OB_DISCOVERY')) return;

  const queryKey = discoveryKeys.home(lat, lng, filters);
  const existing = queryClient.getQueryState(queryKey);
  if (existing?.fetchStatus === 'fetching') return;
  if (existing?.data != null) {
    const age = Date.now() - (existing.dataUpdatedAt ?? 0);
    if (age < DISCOVERY_STALE_TIME_MS && !existing.isInvalidated) return;
  }

  markPerf('discovery_fetch_start', source);
  void queryClient
    .prefetchQuery({
      queryKey,
      queryFn: async () => {
        const result = await loadDiscoveryHome({
          lat,
          lng,
          page: 1,
          limit: 24,
          filters,
        });
        markPerf('discovery_fetch_end', source);
        return result;
      },
      staleTime: DISCOVERY_STALE_TIME_MS,
    })
    .catch(() => {
      // Network errors are surfaced by the mounted query.
    });
}

/** Fire-and-forget discovery warm start — safe before React mounts. */
export function warmDefaultDiscoveryHome(): void {
  const coords = resolveBootstrapDiscoveryCoords();
  warmDiscoveryHome(coords.lat, coords.lng, DEFAULT_FILTERS, 'bootstrap');
}
