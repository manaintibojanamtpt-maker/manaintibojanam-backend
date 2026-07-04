import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { loadFoodMenu } from '../engine/foodExperienceLayer';
import { foodKeys, FOOD_GC_TIME_MS, FOOD_STALE_TIME_MS } from './foodQueryKeys';
import { useFoodFeatureEnabled } from './useFoodFeature';
import { useFoodPreviewStore } from '../store/foodPreviewStore';

export function useFoodMenu(slug: string | undefined) {
  const enabled = useFoodFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const setRestaurant = useFoodPreviewStore((s) => s.setRestaurant);

  useEffect(() => {
    if (slug) setRestaurant(slug);
  }, [slug, setRestaurant]);

  return useQuery({
    queryKey: foodKeys.menu(slug ?? '', coords.lat, coords.lng),
    queryFn: () =>
      loadFoodMenu({
        slug: slug!,
        lat: coords.lat,
        lng: coords.lng,
      }),
    enabled: enabled && Boolean(slug),
    staleTime: FOOD_STALE_TIME_MS,
    gcTime: FOOD_GC_TIME_MS,
    retry: 2,
    placeholderData: (previous) => previous,
  });
}
