import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import {
  loadRestaurantExperience,
  resolveRestaurantCoords,
} from '../engine/restaurantExperienceLayer';
import {
  restaurantKeys,
} from './restaurantQueryKeys';
import { useRestaurantFeatureEnabled } from './useRestaurantFeature';

export function useRestaurantExperience(slug: string | undefined) {
  const enabled = useRestaurantFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const lat = coords?.lat ?? 0;
  const lng = coords?.lng ?? 0;
  const liveQuery = getMarketplaceQueryBehavior();

  const queryClient = useQueryClient();

  return useQuery({
    queryKey: restaurantKeys.experience(slug ?? '', lat, lng),
    queryFn: () =>
      loadRestaurantExperience({
        slug: slug!,
        lat,
        lng,
      }),
    enabled: enabled && Boolean(slug),
    ...liveQuery,
    gcTime: Math.max(liveQuery.gcTime, 15 * 60_000),
    staleTime: Math.max(liveQuery.staleTime, 60_000),
    // Show cached data immediately, then revalidate in background
    placeholderData: (previous) =>
      previous ??
      (slug ? queryClient.getQueryData(restaurantKeys.experience(slug, lat, lng)) : undefined),
    // Don't invalidate on window focus - keep cached data visible
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Location change should NOT invalidate restaurant queries.
 * Restaurant data (name, description, hours, etc.) is independent of customer location.
 * Only delivery fee/slots depend on location, which are handled in checkout.
 *
 * This function is kept for compatibility but does nothing.
 * @deprecated Restaurant queries should not be invalidated by location changes
 */
export function useRestaurantLocationInvalidation() {
  // Intentionally empty - location changes should not cause restaurant skeleton flash
  // Restaurant experience data is stable across customer location changes
}
