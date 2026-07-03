/**
 * Discovery domain — ranking signal computation (M3 PR-5).
 */

import type { DiscoveryQuery } from '../../../sdk/discovery/dto/candidates';
import type { EligibleCandidate } from '../../../sdk/discovery/dto/eligibleCandidate';
import {
  normalizeCuisineMatchSignal,
  normalizeDistanceSignal,
  normalizeEtaSignal,
  normalizePrepTimeSignal,
  normalizeRadiusHeadroomSignal,
  normalizeRatingSignal,
  type RankingSignals,
} from './RankingPolicy';

export function computeBatchMaxDistanceKm(candidates: readonly EligibleCandidate[]): number {
  let max = 0;
  for (const entry of candidates) {
    if (Number.isFinite(entry.distanceKm) && entry.distanceKm > max) {
      max = entry.distanceKm;
    }
  }
  return max;
}

export function computeRankingSignals(
  entry: EligibleCandidate,
  query: DiscoveryQuery,
  maxDistanceKm: number
): RankingSignals {
  const { candidate, distanceKm } = entry;

  return {
    distance: normalizeDistanceSignal(distanceKm, maxDistanceKm),
    deliveryRadius: normalizeRadiusHeadroomSignal(distanceKm, candidate.maxRadiusKm),
    kitchenOpen: candidate.isOpen === true ? 1 : 0,
    storeAvailability: candidate.isLive === true ? 1 : 0,
    preparationTime: normalizePrepTimeSignal(candidate.prepTimeMins),
    deliveryEta: normalizeEtaSignal(candidate.prepTimeMins, distanceKm),
    cuisineMatch: normalizeCuisineMatchSignal(candidate.cuisineTags, query.cuisineTags),
    rating: normalizeRatingSignal(candidate.rating),
  };
}
