import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useActiveLocation } from '@/features/location';
import {
  loadRestaurantExperience,
  resolveRestaurantCoords,
} from '../engine/restaurantExperienceLayer';
import {
  restaurantKeys,
  RESTAURANT_GC_TIME_MS,
  RESTAURANT_STALE_TIME_MS,
} from './restaurantQueryKeys';
import { useRestaurantFeatureEnabled } from './useRestaurantFeature';

export function useRestaurantExperience(slug: string | undefined) {
  const enabled = useRestaurantFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);

  return useQuery({
    queryKey: restaurantKeys.experience(slug ?? '', coords.lat, coords.lng),
    queryFn: () =>
      loadRestaurantExperience({
        slug: slug!,
        lat: coords.lat,
        lng: coords.lng,
      }),
    enabled: enabled && Boolean(slug),
    staleTime: RESTAURANT_STALE_TIME_MS,
    gcTime: RESTAURANT_GC_TIME_MS,
    retry: 2,
    placeholderData: (previous) => previous,
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
