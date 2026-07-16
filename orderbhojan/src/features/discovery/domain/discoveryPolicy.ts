import type { DiscoveryFilters } from '@/types/marketplace-discovery';

/** Consumer discovery radius — kitchens beyond this are never shown. */
export const CONSUMER_MAX_DISCOVERY_DISTANCE_KM = 18;

export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  sort: 'popularity',
  maxDistanceKm: CONSUMER_MAX_DISCOVERY_DISTANCE_KM,
};

export function isWithinConsumerRadius(distanceKm: number | undefined): boolean {
  if (distanceKm == null || !Number.isFinite(distanceKm)) return false;
  return distanceKm <= CONSUMER_MAX_DISCOVERY_DISTANCE_KM;
}

/** Avoid double-filtering collection rails that are already kitchen-scoped. */
export function filtersForDiscoveryCollection(
  collectionId: string,
  filters: DiscoveryFilters,
): DiscoveryFilters {
  if (collectionId === 'cloud-kitchens') {
    return Object.fromEntries(
      Object.entries(filters).filter(
        ([key]) => key !== 'cloudKitchenOnly' && key !== 'kitchenFormat',
      ),
    ) as DiscoveryFilters;
  }
  return filters;
}
