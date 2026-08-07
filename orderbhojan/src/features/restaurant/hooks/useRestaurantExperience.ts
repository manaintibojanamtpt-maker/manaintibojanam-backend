import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
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
    initialData: () =>
      slug
        ? queryClient.getQueryData(restaurantKeys.experience(slug, lat, lng))
        : undefined,
    initialDataUpdatedAt: () =>
      slug
        ? queryClient.getQueryState(restaurantKeys.experience(slug, lat, lng))?.dataUpdatedAt
        : undefined,
    placeholderData: (previous) =>
      previous ??
      (slug ? queryClient.getQueryData(restaurantKeys.experience(slug, lat, lng)) : undefined),
    retry: 2,
  });
}

export function useRestaurantLocationInvalidation() {
  const queryClient = useQueryClient();
  const activeLocation = useActiveLocation();
  const enabled = useRestaurantFeatureEnabled();
  const lat = activeLocation?.coordinates.lat;
  const lng = activeLocation?.coordinates.lng;

  useEffect(() => {
    if (!enabled || lat == null || lng == null) return;
    void queryClient.invalidateQueries({ queryKey: restaurantKeys.all });
  }, [enabled, lat, lng, queryClient]);
}
