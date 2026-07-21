import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useActiveLocation } from '@/features/location';
import { resolveActiveDeliveryCoords } from '@/features/location/domain/activeDeliveryLocation';
import { queryClient } from '@/shared/queryClient';
import { warmDiscoveryHome } from '../engine/discoveryBootstrap';
import { useDiscoveryLocationInvalidation } from '../hooks/useDiscoveryHome';
import { discoveryKeys } from '../hooks/discoveryQueryKeys';
import { useDiscoveryFeatureEnabled } from '../hooks/useDiscoveryFeature';

const DEFAULT_FILTERS = {};

/** Safety-net warm start after location store rehydrates. Bootstrap handles the first pass. */
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();

  useDiscoveryLocationInvalidation();

  useEffect(() => {
    if (!enabled) return;
    const coords = resolveActiveDeliveryCoords(activeLocation);
    if (!coords) return;
    const queryKey = discoveryKeys.home(coords.lat, coords.lng, DEFAULT_FILTERS);
    if (queryClient.getQueryData(queryKey)) return;
    warmDiscoveryHome(coords.lat, coords.lng, DEFAULT_FILTERS, 'provider');
  }, [enabled, activeLocation?.coordinates.lat, activeLocation?.coordinates.lng]);

  return children;
}
