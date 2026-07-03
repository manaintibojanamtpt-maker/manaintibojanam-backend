/**
 * M4 PR-8 — marketplace search filter & sort presentation types.
 */

export interface MarketplaceSearchFilterState {
  readonly openNow: boolean;
  readonly vegOnly: boolean;
  readonly maxDistanceKm?: number;
  readonly minRating?: number;
  readonly maxDeliveryMins?: number;
}

export type MarketplaceSearchSort = 'recommended' | 'distance' | 'rating';

export const DEFAULT_MARKETPLACE_SEARCH_FILTERS: MarketplaceSearchFilterState = {
  openNow: false,
  vegOnly: false,
};

export const DEFAULT_MARKETPLACE_SEARCH_SORT: MarketplaceSearchSort = 'recommended';

export const MARKETPLACE_DISTANCE_FILTER_OPTIONS = [3, 5, 10, 15] as const;

export const MARKETPLACE_RATING_FILTER_OPTIONS = [3.5, 4, 4.5] as const;

export const MARKETPLACE_DELIVERY_TIME_FILTER_OPTIONS = [30, 45, 60] as const;

export const countActiveSearchFilters = (filters: MarketplaceSearchFilterState): number => {
  let count = 0;
  if (filters.openNow) count += 1;
  if (filters.vegOnly) count += 1;
  if (filters.maxDistanceKm !== undefined) count += 1;
  if (filters.minRating !== undefined) count += 1;
  if (filters.maxDeliveryMins !== undefined) count += 1;
  return count;
};

export const filtersEqual = (
  left: MarketplaceSearchFilterState,
  right: MarketplaceSearchFilterState
): boolean =>
  left.openNow === right.openNow &&
  left.vegOnly === right.vegOnly &&
  left.maxDistanceKm === right.maxDistanceKm &&
  left.minRating === right.minRating &&
  left.maxDeliveryMins === right.maxDeliveryMins;
