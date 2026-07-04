import type { SearchFilters, SearchSort } from '@/types/marketplace-search';

export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  sort: 'popularity',
};

export function serializeSearchFilters(
  filters: SearchFilters,
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {};
  if (filters.cuisines?.length) query.cuisines = filters.cuisines.join(',');
  if (filters.vegOnly) query.vegOnly = true;
  if (filters.nonVegOnly) query.nonVegOnly = true;
  if (filters.cloudKitchenOnly) query.cloudKitchenOnly = true;
  if (filters.openNowOnly) query.openNowOnly = true;
  if (filters.offersOnly) query.offersOnly = true;
  if (filters.minRating != null) query.minRating = filters.minRating;
  if (filters.maxDistanceKm != null) query.maxDistanceKm = filters.maxDistanceKm;
  if (filters.maxEtaMinutes != null) query.maxEtaMinutes = filters.maxEtaMinutes;
  if (filters.maxDeliveryFee != null) query.maxDeliveryFee = filters.maxDeliveryFee;
  if (filters.priceRange) query.priceRange = filters.priceRange;
  if (filters.sort) query.sort = filters.sort;
  return query;
}

export const SEARCH_SORT_OPTIONS: { id: SearchSort; label: string }[] = [
  { id: 'popularity', label: 'Popular' },
  { id: 'distance', label: 'Nearest' },
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
  { id: 'alphabetical', label: 'A–Z' },
];
