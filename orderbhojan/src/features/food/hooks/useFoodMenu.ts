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
import { mergeMenuItemsIntoSearchCache } from '@/features/search/store/searchMenuCacheStore';
import type { FoodMenuResponse } from '@/types/marketplace-food';
import type { SearchResultItem } from '@/types/marketplace-search';

function seedAssistMenuCache(menu: FoodMenuResponse, restaurantId: string | null) {
  const items: SearchResultItem[] = menu.items
    .filter((item) => item.availability !== false)
    .map((item) => ({
      id: item.foodId,
      type: 'food' as const,
      label: item.name,
      slug: item.slug,
      ...(menu.restaurantName || restaurantId
        ? {
            restaurant: {
              restaurantId: restaurantId ?? `slug:${menu.slug}`,
              restaurantSlug: menu.slug,
              displayName: menu.restaurantName ?? menu.slug,
              cuisines: [],
              isOpen: true,
              badges: [],
              kitchenFormat: 'cloud_kitchen' as const,
            },
          }
        : {}),
      meta: {
        price: item.offerPrice ?? item.price,
        isVeg: item.dietary === 'veg',
      },
    }));
  if (items.length) mergeMenuItemsIntoSearchCache(items);
}

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
  const lat = coords?.lat ?? 0;
  const lng = coords?.lng ?? 0;
  const setRestaurant = useCartStore((s) => s.setRestaurant);
  const liveQuery = getMarketplaceQueryBehavior();
  const queryClient = useQueryClient();

  useLayoutEffect(() => {
    if (!slug) {
      setActiveMenuRouteSlug(null);
      return;
    }
    syncMenuContextForSlug(slug, lat, lng, queryClient, setRestaurant);
    return () => setActiveMenuRouteSlug(null);
  }, [slug, lat, lng, queryClient, setRestaurant]);

  useLayoutEffect(() => {
    if (!slug) return;
    const resync = () => {
      syncMenuContextForSlug(slug, lat, lng, queryClient, setRestaurant);
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
  }, [slug, lat, lng, queryClient, setRestaurant]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void hydrateFoodSessionCacheFromIdb(slug, lat, lng).then(() => {
      if (cancelled) return;
      const cached = readFoodSessionCache(slug, lat, lng);
      if (!cached) return;
      syncMenuRestaurantContext(slug, lat, lng, cached);
      queryClient.setQueryData(foodKeys.menu(slug, lat, lng), cached, {
        updatedAt: getFoodSessionCacheUpdatedAt(slug, lat, lng),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [slug, lat, lng, queryClient]);

  const query = useQuery({
    queryKey: foodKeys.menu(slug ?? '', lat, lng),
    queryFn: () =>
      loadFoodMenu({
        slug: slug!,
        lat,
        lng,
      }),
    enabled: enabled && Boolean(slug),
    ...liveQuery,
    initialData: () =>
      slug ? readFoodSessionCache(slug, lat, lng) : undefined,
    initialDataUpdatedAt: () =>
      slug ? getFoodSessionCacheUpdatedAt(slug, lat, lng) : undefined,
    placeholderData: (previous) =>
      previous ??
      (slug ? readFoodSessionCache(slug, lat, lng) : undefined),
    retry: 2,
  });

  useLayoutEffect(() => {
    if (!slug || !query.data) return;
    syncMenuRestaurantContext(slug, lat, lng, query.data);
    const restaurantId = useRestaurantContextStore.getState().restaurantId;
    seedAssistMenuCache(query.data, restaurantId);
  }, [slug, lat, lng, query.data]);

  return query;
}
