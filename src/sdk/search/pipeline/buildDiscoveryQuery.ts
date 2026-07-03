/**
 * SearchSDK — SearchQuery → DiscoveryQuery mapping (M4 PR-6).
 * Forwards geo context only — Discovery owns ranking and eligibility.
 */

import type { DiscoveryQuery } from '../../discovery/dto/candidates';
import type { SearchQuery } from '../dto';

const DEFAULT_DISCOVERY_LIMIT = 50;

export function buildDiscoveryQueryFromSearch(query: SearchQuery): DiscoveryQuery {
  return {
    customerPoint: query.customerPoint,
    customerGeohash: query.customerGeohash,
    radiusKm: query.radiusKm,
    limit: query.limit ?? DEFAULT_DISCOVERY_LIMIT,
    searchText: query.text?.trim() || query.filters?.restaurantName?.trim() || undefined,
    cuisineTags: query.filters?.cuisine?.tags,
    areaCode: query.filters?.area?.areaCode,
    includeClosed: query.openNow ? false : undefined,
  };
}
