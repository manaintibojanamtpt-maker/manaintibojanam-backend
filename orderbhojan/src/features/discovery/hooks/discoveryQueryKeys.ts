import type { DiscoveryCollectionId, DiscoveryFilters } from '@/types/marketplace-discovery';

export const discoveryKeys = {
  all: ['discovery'] as const,
  home: (lat: number, lng: number, filters: DiscoveryFilters) =>
    [...discoveryKeys.all, 'home', lat, lng, filters] as const,
  collection: (
    id: DiscoveryCollectionId,
    lat: number,
    lng: number,
    page: number,
    filters: DiscoveryFilters,
  ) => [...discoveryKeys.all, 'collection', id, lat, lng, page, filters] as const,
};

export const DISCOVERY_STALE_TIME_MS = 5 * 60_000;
export const DISCOVERY_GC_TIME_MS = 30 * 60_000;
