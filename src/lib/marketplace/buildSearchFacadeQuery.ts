/**
 * M4 PR-8 — map presentation filters to SearchFacade query fields.
 */

import type { SearchFacadeQuery } from '../search/types';
import type { MarketplaceSearchFilterState } from './searchFilterTypes';

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 24;

export function buildMarketplaceSearchFacadeQuery(
  text: string,
  filters: MarketplaceSearchFilterState
): SearchFacadeQuery {
  return {
    text: text.trim(),
    radiusKm: filters.maxDistanceKm ?? DEFAULT_RADIUS_KM,
    limit: DEFAULT_LIMIT,
    openNow: filters.openNow || undefined,
    vegOnly: filters.vegOnly || undefined,
    minRating: filters.minRating,
    maxDeliveryMins: filters.maxDeliveryMins,
    maxDistanceKm: filters.maxDistanceKm,
  };
}
