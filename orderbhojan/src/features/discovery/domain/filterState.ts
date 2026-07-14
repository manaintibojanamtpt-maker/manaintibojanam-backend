import type { DiscoveryFilters } from '@/types/marketplace-discovery';
import { CONSUMER_MAX_DISCOVERY_DISTANCE_KM, DEFAULT_DISCOVERY_FILTERS } from './discoveryPolicy';

export function hasDiscoveryFilterOverrides(
  filters: DiscoveryFilters = DEFAULT_DISCOVERY_FILTERS,
): boolean {
  return Boolean(
    filters.vegOnly ||
      filters.kitchenFormat ||
      filters.offersOnly ||
      filters.openNowOnly ||
      filters.cloudKitchenOnly ||
      filters.minRating != null ||
      filters.maxDeliveryFee != null ||
      (filters.cuisines?.length ?? 0) > 0 ||
      (filters.maxDistanceKm != null &&
        filters.maxDistanceKm < CONSUMER_MAX_DISCOVERY_DISTANCE_KM) ||
      (filters.sort != null && filters.sort !== DEFAULT_DISCOVERY_FILTERS.sort),
  );
}
