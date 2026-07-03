/**
 * SearchSDK — enriched candidate → SearchRestaurantHit mapping (M4 PR-6).
 * Applies facet filters without re-ranking — Discovery order is preserved.
 */

import type { NearbyRestaurant } from '../../discovery/dto/candidates';
import type { SearchQuery, SearchRestaurantHit } from '../dto';
import type { SearchEnrichedCandidate } from './types';

const passesSearchFacets = (restaurant: NearbyRestaurant, query: SearchQuery): boolean => {
  if (query.openNow && !restaurant.isOpen) {
    return false;
  }

  if (query.minRating !== undefined) {
    const rating = restaurant.rating ?? 0;
    if (rating < query.minRating) {
      return false;
    }
  }

  if (query.maxDeliveryMins !== undefined) {
    const totalMins = restaurant.eta?.totalMins;
    if (totalMins !== undefined && totalMins > query.maxDeliveryMins) {
      return false;
    }
  }

  if (query.maxDistanceKm !== undefined && restaurant.distanceKm > query.maxDistanceKm) {
    return false;
  }

  return true;
};

const mapHitToMatchExplanation = (
  hit: SearchEnrichedCandidate['hit'],
  rank: number
): SearchRestaurantHit['match'] => ({
  score: hit.score,
  rank,
  factors: [
    {
      matchType: hit.matchType,
      field: hit.field,
      signal: hit.score,
      weight: 1,
      contribution: hit.score,
      label: `${hit.matchType} on ${hit.field}`,
    },
  ],
});

export function mapEnrichedCandidatesToRestaurantHits(
  pairs: readonly SearchEnrichedCandidate[],
  query: SearchQuery
): SearchRestaurantHit[] {
  const filtered = pairs.filter((pair) => passesSearchFacets(pair.restaurant, query));

  return filtered.map((pair, index) => ({
    restaurant: pair.restaurant,
    match: mapHitToMatchExplanation(pair.hit, index + 1),
    highlights: pair.hit.snippet
      ? [
          {
            field: pair.hit.field,
            snippet: pair.hit.snippet,
          },
        ]
      : undefined,
  }));
}
