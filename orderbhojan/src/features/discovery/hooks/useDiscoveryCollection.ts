import { useQuery } from '@tanstack/react-query';
import type { DiscoveryCollectionId } from '@/types/marketplace-discovery';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { resolveActiveDeliveryCoords } from '@/features/location/domain/activeDeliveryLocation';
import { loadDiscoveryCollection } from '../engine/discoveryEngine';
import { discoveryKeys } from './discoveryQueryKeys';
import { useDiscoveryFilterStore } from '../store/discoveryFilterStore';
import { useDiscoveryFeatureEnabled } from './useDiscoveryFeature';

export function useDiscoveryCollection(
  collectionId: DiscoveryCollectionId,
  page = 1,
) {
  const enabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const filters = useDiscoveryFilterStore((s) => s.filters);
  const coords = resolveActiveDeliveryCoords(activeLocation);
  const liveQuery = getMarketplaceQueryBehavior();

  return useQuery({
    queryKey: coords
      ? discoveryKeys.collection(collectionId, coords.lat, coords.lng, page, filters)
      : [...discoveryKeys.all, 'collection', collectionId, 'unconfirmed', page, filters],
    queryFn: () => {
      if (!coords) {
        throw new Error('Delivery location is required for discovery');
      }
      return loadDiscoveryCollection(collectionId, {
        lat: coords.lat,
        lng: coords.lng,
        page,
        limit: 6,
        filters,
      });
    },
    enabled: enabled && coords != null,
    ...liveQuery,
    retry: 2,
  });
}
