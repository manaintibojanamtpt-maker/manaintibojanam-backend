import type { RestaurantPublic } from '@/types/marketplace';
import type { DiscoveryFilters, DiscoverySort } from '@/types/marketplace-discovery';
import { restaurantMatchesDiscoveryCuisineFilter } from './homeCategoryCuisine';
import { DEFAULT_DISCOVERY_FILTERS } from './discoveryPolicy';

export { DEFAULT_DISCOVERY_FILTERS } from './discoveryPolicy';

export function applyDiscoveryFilters(
  restaurants: readonly RestaurantPublic[],
  filters: DiscoveryFilters = DEFAULT_DISCOVERY_FILTERS,
): RestaurantPublic[] {
  let result = [...restaurants];

  if (filters.maxDistanceKm != null) {
    result = result.filter((r) => (r.distanceKm ?? Infinity) <= filters.maxDistanceKm!);
  }
  if (filters.minRating != null) {
    result = result.filter((r) => (r.rating ?? 0) >= filters.minRating!);
  }
  if (filters.maxDeliveryFee != null) {
    result = result.filter((r) => {
      const fee = r.deliveryFee ?? 0;
      return fee <= filters.maxDeliveryFee!;
    });
  }
  if (filters.vegOnly) {
    result = result.filter(
      (r) => r.badges.includes('veg') || r.badges.includes('pure_veg'),
    );
  }
  if (filters.cloudKitchenOnly) {
    result = result.filter((r) => r.badges.includes('cloud_kitchen') || r.kitchenFormat === 'cloud_kitchen');
  }
  if (filters.kitchenFormat) {
    result = result.filter((r) => r.kitchenFormat === filters.kitchenFormat);
  }
  if (filters.offersOnly) {
    result = result.filter((r) => r.badges.includes('offer'));
  }
  if (filters.openNowOnly) {
    result = result.filter((r) => r.isOpen);
  }
  if (filters.cuisines?.length) {
    result = result.filter((r) => restaurantMatchesDiscoveryCuisineFilter(r.cuisines, filters.cuisines!));
  }

  return sortRestaurants(result, filters.sort);
}

export function sortRestaurants(
  restaurants: readonly RestaurantPublic[],
  sort: DiscoverySort = 'popularity',
): RestaurantPublic[] {
  const copy = [...restaurants];

  switch (sort) {
    case 'distance':
      return copy.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    case 'rating':
      return copy.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    case 'eta':
      return copy.sort(
        (a, b) => (a.etaMinutes?.min ?? 999) - (b.etaMinutes?.min ?? 999),
      );
    case 'newest':
      return copy.sort((a, b) => {
        const aNew = a.badges.includes('new') ? 1 : 0;
        const bNew = b.badges.includes('new') ? 1 : 0;
        return bNew - aNew;
      });
    case 'alphabetical':
      return copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    case 'popularity':
    default:
      return copy.sort((a, b) => (b.ratingCount ?? 0) - (a.ratingCount ?? 0));
  }
}

export function serializeDiscoveryFilters(filters: DiscoveryFilters): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  if (filters.maxDistanceKm != null) query.maxDistanceKm = filters.maxDistanceKm;
  if (filters.minRating != null) query.minRating = filters.minRating;
  if (filters.maxDeliveryFee != null) query.maxDeliveryFee = filters.maxDeliveryFee;
  if (filters.vegOnly) query.vegOnly = true;
  if (filters.cloudKitchenOnly) query.cloudKitchenOnly = true;
  if (filters.kitchenFormat) query.kitchenFormat = filters.kitchenFormat;
  if (filters.offersOnly) query.offersOnly = true;
  if (filters.openNowOnly) query.openNowOnly = true;
  if (filters.cuisines?.length) query.cuisines = filters.cuisines.join(',');
  if (filters.sort) query.sort = filters.sort;
  return query;
}
