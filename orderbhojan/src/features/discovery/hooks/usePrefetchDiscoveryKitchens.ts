import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { DiscoveryHomeResponse } from '@/types/marketplace-discovery';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { loadFoodMenu } from '@/features/food/engine/foodExperienceLayer';
import { foodKeys } from '@/features/food/hooks/foodQueryKeys';
import {
  loadRestaurantExperience,
  resolveRestaurantCoords,
} from '@/features/restaurant/engine/restaurantExperienceLayer';
import { restaurantKeys } from '@/features/restaurant/hooks/restaurantQueryKeys';
import { collectUniqueRestaurants } from '@/features/experience/utils/homeSpotlightFeed';

const PREFETCH_KITCHEN_LIMIT = 4;

/** Warm restaurant + menu queries for above-the-fold kitchens (silent, stale-aware). */
export function usePrefetchDiscoveryKitchens(feed: DiscoveryHomeResponse | undefined): void {
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const liveQuery = getMarketplaceQueryBehavior();
  const prefetchedRef = useRef<string>('');

  useEffect(() => {
    if (!feed?.collections?.length) return;

    const kitchens = collectUniqueRestaurants(feed.collections).slice(0, PREFETCH_KITCHEN_LIMIT);
    const signature = kitchens.map((kitchen) => kitchen.restaurantSlug).join('|');
    if (!signature || prefetchedRef.current === signature) return;
    prefetchedRef.current = signature;

    const coords = resolveRestaurantCoords(activeLocation);

    for (const kitchen of kitchens) {
      const slug = kitchen.restaurantSlug;
      if (!slug) continue;

      void queryClient.prefetchQuery({
        queryKey: restaurantKeys.experience(slug, coords.lat, coords.lng),
        queryFn: () =>
          loadRestaurantExperience({
            slug,
            lat: coords.lat,
            lng: coords.lng,
          }),
        staleTime: liveQuery.staleTime,
      });

      void queryClient.prefetchQuery({
        queryKey: foodKeys.menu(slug, coords.lat, coords.lng),
        queryFn: () =>
          loadFoodMenu({
            slug,
            lat: coords.lat,
            lng: coords.lng,
          }),
        staleTime: liveQuery.staleTime,
      });
    }

    void import('@/features/restaurant');
    void import('@/features/food/ui/FoodRoutePage');
  }, [activeLocation, feed, liveQuery.staleTime, queryClient]);
}
