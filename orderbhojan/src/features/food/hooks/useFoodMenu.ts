import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import {
  getFoodSessionCacheUpdatedAt,
  hydrateFoodSessionCacheFromIdb,
  readFoodSessionCache,
} from '../engine/foodSessionCache';
import { loadFoodMenu } from '../engine/foodExperienceLayer';
import { foodKeys } from './foodQueryKeys';
import { useFoodFeatureEnabled } from './useFoodFeature';
import { useCartStore } from '@/features/cart/store/cartStore';

export function useFoodMenu(slug: string | undefined) {
  const enabled = useFoodFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const setRestaurant = useCartStore((s) => s.setRestaurant);
  const liveQuery = getMarketplaceQueryBehavior();

  useEffect(() => {
    if (slug) setRestaurant(slug);
  }, [slug, setRestaurant]);

  useEffect(() => {
    if (!slug) return;
    void hydrateFoodSessionCacheFromIdb(slug, coords.lat, coords.lng);
  }, [slug, coords.lat, coords.lng]);

  return useQuery({
    queryKey: foodKeys.menu(slug ?? '', coords.lat, coords.lng),
    queryFn: () =>
      loadFoodMenu({
        slug: slug!,
        lat: coords.lat,
        lng: coords.lng,
      }),
    enabled: enabled && Boolean(slug),
    ...liveQuery,
    initialData: () =>
      slug ? readFoodSessionCache(slug, coords.lat, coords.lng) : undefined,
    initialDataUpdatedAt: () =>
      slug ? getFoodSessionCacheUpdatedAt(slug, coords.lat, coords.lng) : undefined,
    placeholderData: (previous) =>
      previous ??
      (slug ? readFoodSessionCache(slug, coords.lat, coords.lng) : undefined),
    retry: 2,
  });
}
