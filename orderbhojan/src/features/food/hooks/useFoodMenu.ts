import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import {
  getFoodSessionCacheUpdatedAt,
  hydrateFoodSessionCacheFromIdb,
  readFoodSessionCache,
} from '../engine/foodSessionCache';
import {
  loadFoodMenu,
  syncRestaurantContextFromMenuCache,
} from '../engine/foodExperienceLayer';
import { foodKeys } from './foodQueryKeys';
import { useFoodFeatureEnabled } from './useFoodFeature';
import { useCartStore } from '@/features/cart/store/cartStore';
import { sanitizeRestaurantSlugContext } from '@/lib/sanitizeLiveRestaurantContext';
import type { FoodMenuResponse } from '@/types/marketplace-food';

function syncMenuRestaurantContext(
  slug: string,
  lat: number,
  lng: number,
  menu?: FoodMenuResponse | null,
): void {
  sanitizeRestaurantSlugContext(slug);
  syncRestaurantContextFromMenuCache(slug, lat, lng, menu);
}

export function useFoodMenu(slug: string | undefined) {
  const enabled = useFoodFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const setRestaurant = useCartStore((s) => s.setRestaurant);
  const liveQuery = getMarketplaceQueryBehavior();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (slug) setRestaurant(slug);
  }, [slug, setRestaurant]);

  useEffect(() => {
    if (!slug) return;
    syncMenuRestaurantContext(slug, coords.lat, coords.lng);
  }, [slug, coords.lat, coords.lng]);

  useEffect(() => {
    if (!slug) return;
    const rehydrate = useRestaurantContextStore.persist.onFinishHydration(() => {
      syncMenuRestaurantContext(slug, coords.lat, coords.lng, queryClient.getQueryData(
        foodKeys.menu(slug, coords.lat, coords.lng),
      ) as FoodMenuResponse | undefined);
    });
    if (useRestaurantContextStore.persist.hasHydrated()) {
      syncMenuRestaurantContext(
        slug,
        coords.lat,
        coords.lng,
        queryClient.getQueryData(foodKeys.menu(slug, coords.lat, coords.lng)) as
          | FoodMenuResponse
          | undefined,
      );
    }
    return rehydrate;
  }, [slug, coords.lat, coords.lng, queryClient]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void hydrateFoodSessionCacheFromIdb(slug, coords.lat, coords.lng).then(() => {
      if (cancelled) return;
      const cached = readFoodSessionCache(slug, coords.lat, coords.lng);
      if (!cached) return;
      syncMenuRestaurantContext(slug, coords.lat, coords.lng, cached);
      queryClient.setQueryData(foodKeys.menu(slug, coords.lat, coords.lng), cached, {
        updatedAt: getFoodSessionCacheUpdatedAt(slug, coords.lat, coords.lng),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [slug, coords.lat, coords.lng, queryClient]);

  const query = useQuery({
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

  useEffect(() => {
    if (!slug || !query.data) return;
    syncMenuRestaurantContext(slug, coords.lat, coords.lng, query.data);
  }, [slug, coords.lat, coords.lng, query.data]);

  return query;
}
