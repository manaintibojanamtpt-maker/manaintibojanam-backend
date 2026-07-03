/**
 * M4 PR-8 — presentation-layer search result sorting (no SDK ranking changes).
 */

import type { MarketplaceSearchResultCard } from './searchTypes';
import type { MarketplaceSearchSort } from './searchFilterTypes';

export function sortMarketplaceSearchResults(
  results: readonly MarketplaceSearchResultCard[],
  sort: MarketplaceSearchSort
): MarketplaceSearchResultCard[] {
  const copy = [...results];

  if (sort === 'distance') {
    return copy.sort((left, right) => left.distanceKm - right.distanceKm);
  }

  if (sort === 'rating') {
    return copy.sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
  }

  return copy;
}
