import { useQuery } from '@tanstack/react-query';
import { useDiscoveryFeatureEnabled } from '@/features/discovery/hooks/useDiscoveryFeature';
import { getDiscoveryApiClient } from '@/features/discovery/infrastructure/discoveryApiClient';
import { resolveActiveDeliveryCoords } from '@/features/location/domain/activeDeliveryLocation';
import { useActiveLocation } from '@/features/location';
import type { RestaurantPublic } from '@/types/marketplace';

const HERO_OFFERS_STALE_MS = 5 * 60 * 1000;

export function homeHeroOffersQueryKey(lat: number, lng: number) {
  return ['marketplace', 'discovery', 'offers', 'hero', lat, lng] as const;
}

export function useHomeHeroOfferRestaurants(enabled: boolean) {
  const discoveryEnabled = useDiscoveryFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveActiveDeliveryCoords(activeLocation);

  return useQuery({
    queryKey: coords
      ? homeHeroOffersQueryKey(coords.lat, coords.lng)
      : ['marketplace', 'discovery', 'offers', 'hero', 'unconfirmed'],
    queryFn: async (): Promise<readonly RestaurantPublic[]> => {
      if (!coords) return [];
      const response = await getDiscoveryApiClient().fetchOffers({
        lat: coords.lat,
        lng: coords.lng,
        page: 1,
        limit: 8,
      });
      return response.collection.restaurants;
    },
    enabled: enabled && discoveryEnabled && coords != null,
    staleTime: HERO_OFFERS_STALE_MS,
    gcTime: HERO_OFFERS_STALE_MS * 2,
    refetchOnWindowFocus: false,
    placeholderData: [],
  });
}
