import { isFeatureEnabled, loadFeatureFlags } from '@/featureFlags';
import { markPerf } from '@/lib/perfMarks';
import { queryClient } from '@/shared/queryClient';
import {
  readPersistedActiveLocationCoords,
  resolveActiveDeliveryCoords,
} from '@/features/location/domain/activeDeliveryLocation';
import {
  loadDiscoveryHome,
} from './discoveryEngine';
import { discoveryKeys, DISCOVERY_STALE_TIME_MS } from '../hooks/discoveryQueryKeys';
import {
  getDiscoverySessionCacheUpdatedAt,
  listDiscoverySessionCacheEntries,
  readDiscoverySessionCache,
} from './discoverySessionCache';

const DEFAULT_FILTERS = {};

/** Resolve delivery coords synchronously before React / zustand rehydration. */
export function resolveBootstrapDiscoveryCoords(): { lat: number; lng: number } | null {
  const persisted = readPersistedActiveLocationCoords();
  if (persisted) return persisted;

  return resolveActiveDeliveryCoords(null);
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
  if (!coords) return;

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
    })
    .catch(() => {
      // Network errors are surfaced by the mounted query.
    });
}

/** @deprecated Do not warm discovery without confirmed coordinates — use warmDiscoveryHome directly. */
export function warmDefaultDiscoveryHome(): void {
  const coords = resolveBootstrapDiscoveryCoords();
  if (!coords) return;
  warmDiscoveryHome(coords.lat, coords.lng, DEFAULT_FILTERS, 'bootstrap');
}
