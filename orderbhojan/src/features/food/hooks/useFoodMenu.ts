import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect } from 'react';
import { getMarketplaceQueryBehavior } from '@/config/marketplaceQueryPolicy';
import { useActiveLocation } from '@/features/location';
import { resolveRestaurantCoords } from '@/features/restaurant/engine/restaurantExperienceLayer';
import { useRestaurantContextStore } from '@/features/restaurant/store/restaurantContextStore';
import {
  getFoodSessionCacheUpdatedAt,
  hydrateFoodSessionCacheFromIdb,
  readFoodSessionCache,
} from '../engine/foodSessionCache';
import { loadFoodMenu, syncMenuRestaurantContext } from '../engine/foodExperienceLayer';
import { foodKeys } from './foodQueryKeys';
import { useFoodFeatureEnabled } from './useFoodFeature';
import { useCartStore } from '@/features/cart/store/cartStore';
import type { FoodMenuResponse } from '@/types/marketplace-food';

function readCachedMenu(
  slug: string,
  lat: number,
  lng: number,
  queryClient: ReturnType<typeof useQueryClient>,
): FoodMenuResponse | undefined {
  return (
    (queryClient.getQueryData(foodKeys.menu(slug, lat, lng)) as FoodMenuResponse | undefined) ??
    readFoodSessionCache(slug, lat, lng) ??
    undefined
  );
}

export function useFoodMenu(slug: string | undefined) {
  const enabled = useFoodFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const setRestaurant = useCartStore((s) => s.setRestaurant);
  const liveQuery = getMarketplaceQueryBehavior();
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (!slug) return;
    setRestaurant(slug);
    syncMenuRestaurantContext(slug, coords.lat, coords.lng, readCachedMenu(slug, coords.lat, coords.lng, queryClient));
  }, [slug, coords.lat, coords.lng, queryClient, setRestaurant]);

  useLayoutEffect(() => {
    if (!slug) return;
    const rehydrate = useRestaurantContextStore.persist.onFinishHydration(() => {
      syncMenuRestaurantContext(
        slug,
        coords.lat,
        coords.lng,
        readCachedMenu(slug, coords.lat, coords.lng, queryClient),
      );
    });
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

  useLayoutEffect(() => {
    if (!slug || !query.data) return;
    syncMenuRestaurantContext(slug, coords.lat, coords.lng, query.data);
  }, [slug, coords.lat, coords.lng, query.data]);

  return query;
}
