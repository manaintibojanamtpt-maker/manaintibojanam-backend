import type { KitchenFormat, RestaurantPublic } from '@/types/marketplace';

export function withKitchenFormat(
  restaurant: Omit<RestaurantPublic, 'kitchenFormat'>,
  override?: KitchenFormat,
): RestaurantPublic {
  if (override) {
    return { ...restaurant, kitchenFormat: override };
  }
  if (restaurant.badges.includes('cloud_kitchen')) {
    return { ...restaurant, kitchenFormat: 'cloud_kitchen' };
  }
  if (restaurant.restaurantSlug.includes('mana-inti')) {
    return { ...restaurant, kitchenFormat: 'home_kitchen' };
  }
  return { ...restaurant, kitchenFormat: 'restaurant' };
}
