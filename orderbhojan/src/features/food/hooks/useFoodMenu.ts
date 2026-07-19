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
import { setActiveMenuRouteSlug } from '../engine/foodMenuRouteContext';
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

function syncMenuContextForSlug(
  slug: string,
  lat: number,
  lng: number,
  queryClient: ReturnType<typeof useQueryClient>,
  setRestaurant: (slug: string) => void,
  menu?: FoodMenuResponse | null,
): void {
  setRestaurant(slug);
  syncMenuRestaurantContext(slug, lat, lng, menu ?? readCachedMenu(slug, lat, lng, queryClient));
}

export function useFoodMenu(slug: string | undefined) {
  const enabled = useFoodFeatureEnabled();
  const activeLocation = useActiveLocation();
  const coords = resolveRestaurantCoords(activeLocation);
  const setRestaurant = useCartStore((s) => s.setRestaurant);
  const liveQuery = getMarketplaceQueryBehavior();
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (!slug) {
      setActiveMenuRouteSlug(null);
      return;
    }
    syncMenuContextForSlug(slug, coords.lat, coords.lng, queryClient, setRestaurant);
    return () => setActiveMenuRouteSlug(null);
  }, [slug, coords.lat, coords.lng, queryClient, setRestaurant]);

  useLayoutEffect(() => {
    if (!slug) return;
    const resync = () => {
      syncMenuContextForSlug(slug, coords.lat, coords.lng, queryClient, setRestaurant);
    };

    const unsubContext = useRestaurantContextStore.persist.onFinishHydration(resync);
    const unsubCart = useCartStore.persist.onFinishHydration(resync);

    if (useRestaurantContextStore.persist.hasHydrated() && useCartStore.persist.hasHydrated()) {
      resync();
    }

    return () => {
      unsubContext();
      unsubCart();
    };
  }, [slug, coords.lat, coords.lng, queryClient, setRestaurant]);

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
