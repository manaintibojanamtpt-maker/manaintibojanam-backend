import type { KitchenFormat, RestaurantPublic } from '@/types/marketplace';
import { isDisplayableDistanceKm } from '@/features/discovery/utils/distanceDisplay';

export function kitchenFormatLabel(format: KitchenFormat): string {
  switch (format) {
    case 'cloud_kitchen':
      return 'Cloud kitchen';
    case 'chef_kitchen':
      return 'Chef kitchen';
    case 'home_kitchen':
      return 'Home kitchen';
    default:
      return 'Restaurant';
  }
}

export function kitchenFormatBadgeVariant(
  format: KitchenFormat,
): 'cloudKitchen' | 'offer' | 'veg' | 'default' {
  switch (format) {
    case 'cloud_kitchen':
      return 'cloudKitchen';
    case 'chef_kitchen':
      return 'offer';
    case 'home_kitchen':
      return 'veg';
    default:
      return 'default';
  }
}

export function formatEta(restaurant: RestaurantPublic): string {
  if (!restaurant.etaMinutes) return '—';
  const { min, max } = restaurant.etaMinutes;
  return `${min}–${max} min`;
}

export function formatDistance(restaurant: RestaurantPublic): string {
  if (!isDisplayableDistanceKm(restaurant.distanceKm)) return '—';
  return `${restaurant.distanceKm.toFixed(1)} km`;
}

export function formatDeliveryFee(restaurant: RestaurantPublic): string | undefined {
  if (restaurant.deliveryFee == null) return undefined;
  if (restaurant.deliveryFee === 0) return 'Free';
  return `₹${restaurant.deliveryFee}`;
}

export function kitchenBadgeLabel(restaurant: RestaurantPublic): string | null {
  if (restaurant.badges.includes('pure_veg')) return 'Pure Veg';
  if (restaurant.badges.includes('veg')) return 'Veg';
  return null;
}

export function shouldShowKitchenBadge(restaurant: RestaurantPublic): boolean {
  return kitchenBadgeLabel(restaurant) != null;
}

export function formatPriceRange(restaurant: RestaurantPublic): string | undefined {
  if (restaurant.priceForTwo == null) return undefined;
  if (restaurant.priceForTwo < 300) return '₹';
  if (restaurant.priceForTwo < 500) return '₹₹';
  if (restaurant.priceForTwo < 800) return '₹₹₹';
  return '₹₹₹₹';
}

export function isVegRestaurant(restaurant: RestaurantPublic): boolean {
  return restaurant.badges.includes('pure_veg') || restaurant.badges.includes('veg');
}

export function isCloudKitchen(restaurant: RestaurantPublic): boolean {
  return restaurant.badges.includes('cloud_kitchen');
}

export function hasOffer(restaurant: RestaurantPublic): boolean {
  return Boolean(restaurant.offer?.trim()) || restaurant.badges.includes('offer');
}

export function resolveOfferBadgeLabel(restaurant: RestaurantPublic): string | undefined {
  const label = restaurant.offer?.trim();
  if (label) return label;
  return hasOffer(restaurant) ? 'Offer' : undefined;
}

export function cuisineLabel(restaurant: RestaurantPublic): string {
  return restaurant.cuisines.slice(0, 2).join(' · ');
}
