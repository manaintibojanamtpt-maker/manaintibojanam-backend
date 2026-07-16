import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { DEFAULT_MARKETPLACE_COORDS } from '@/lib/marketplaceDefaults';
import { queryClient } from '@/shared/queryClient';
import { loadDiscoveryHome } from '../engine/discoveryEngine';
import { useDiscoveryLocationInvalidation } from '../hooks/useDiscoveryHome';
import { discoveryKeys, DISCOVERY_STALE_TIME_MS } from '../hooks/discoveryQueryKeys';
import { useDiscoveryFeatureEnabled } from '../hooks/useDiscoveryFeature';

export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const enabled = useDiscoveryFeatureEnabled();

  useDiscoveryLocationInvalidation();

  useEffect(() => {
    if (!enabled) return;
    const defaultFilters = {};
    void queryClient.prefetchQuery({
      queryKey: discoveryKeys.home(
        DEFAULT_MARKETPLACE_COORDS.lat,
        DEFAULT_MARKETPLACE_COORDS.lng,
        defaultFilters,
      ),
      queryFn: () =>
        loadDiscoveryHome({
          lat: DEFAULT_MARKETPLACE_COORDS.lat,
          lng: DEFAULT_MARKETPLACE_COORDS.lng,
          page: 1,
          limit: 24,
          filters: defaultFilters,
        }),
      staleTime: DISCOVERY_STALE_TIME_MS,
    });
  }, [enabled]);

  return children;
}
