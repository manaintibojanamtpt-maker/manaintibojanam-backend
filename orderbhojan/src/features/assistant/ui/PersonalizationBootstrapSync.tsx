import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { favoritesQueryKeys } from '@/features/favorites';
import { ordersQueryKeys } from '@/features/orders';
import type { OrderSummary, RestaurantPublic } from '@/types/marketplace';
import { publishPersonalizationBootstrap } from './personalizationBootstrapStore';

/**
 * Publishes React Query cache snapshots (favorites + recent orders) to the assistant.
 * Does not trigger new network fetches — only reads cache owned by other screens.
 */
export function PersonalizationBootstrapSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const publishFromCache = () => {
      const favoritesCache = queryClient.getQueryData<RestaurantPublic[]>(favoritesQueryKeys.list());
      const favoriteList = Array.isArray(favoritesCache) ? favoritesCache : [];

      const ordersCache = queryClient.getQueryData<{ orders: OrderSummary[] }>(ordersQueryKeys.list());
      const orderList = Array.isArray(ordersCache?.orders) ? ordersCache.orders : [];

      publishPersonalizationBootstrap({
        favoriteRestaurants: favoriteList.slice(0, 12).map((f) => ({
          id: f.restaurantId,
          slug: f.restaurantSlug,
          displayName: f.displayName,
        })),
        recentOrders: orderList.slice(0, 12).map((o) => ({
          orderId: o.orderId,
          orderNumber: o.orderNumber,
          restaurantId: o.restaurantId,
          displayName: o.displayName,
          status: o.status,
        })),
      });
    };

    publishFromCache();
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      publishFromCache();
    });
    return unsubscribe;
  }, [queryClient]);

  return null;
}
