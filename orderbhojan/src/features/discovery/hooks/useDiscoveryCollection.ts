import { useQuery } from '@tanstack/react-query';
import type { DiscoveryCollectionId } from '@/types/marketplace-discovery';
import { useActiveLocation } from '@/features/location';
import { loadDiscoveryCollection, resolveDiscoveryCoords } from '../engine/discoveryEngine';
import { discoveryKeys, DISCOVERY_GC_TIME_MS, DISCOVERY_STALE_TIME_MS } from './discoveryQueryKeys';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { useDiscoveryFeatureEnabled } from './useDiscoveryFeature';

export function useDiscoveryCollection(
  collectionId: DiscoveryCollectionId,
  page = 1,
) {
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveDiscoveryCoords(activeLocation);

  return useQuery({
    queryKey: discoveryKeys.collection(collectionId, coords.lat, coords.lng, page, filters),
    queryFn: () =>
      loadDiscoveryCollection(collectionId, {
        lat: coords.lat,
        lng: coords.lng,
        page,
        limit: 6,
        filters,
      }),
    enabled,
    staleTime: DISCOVERY_STALE_TIME_MS,
    gcTime: DISCOVERY_GC_TIME_MS,
    retry: 2,
  });
}
