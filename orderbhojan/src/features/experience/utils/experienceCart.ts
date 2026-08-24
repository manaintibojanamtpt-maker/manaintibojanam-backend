import { useCartStore } from '@/features/cart/store/cartStore';
import {
  fallbackRestaurantId,
  useRestaurantContextStore,
} from '@/features/restaurant/store/restaurantContextStore';
import type { MockFoodItem } from '../domain/experience.types';

export function addExperienceFoodToCart(item: MockFoodItem): void {
  const restaurantId = item.restaurantId ?? fallbackRestaurantId(item.restaurantSlug);
  useRestaurantContextStore.getState().setContext({
    restaurantSlug: item.restaurantSlug,
    restaurantId,
    contextToken: `mock_${item.restaurantSlug}`,
    restaurantLat: item.restaurantLat ?? null,
    restaurantLng: item.restaurantLng ?? null,
  });
  useCartStore.getState().addItem({
    foodId: item.id,
    name: item.name,
    price: item.price,
  });
}
