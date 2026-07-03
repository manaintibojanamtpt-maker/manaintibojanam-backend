/**
 * DiscoverySDK — maps ranked candidates to DiscoveryResult (M3 PR-6).
 */

import type { DiscoveryQuery } from '../dto/candidates';
import type { NearbyRestaurant } from '../dto/candidates';
import type { ETAEstimate } from '../dto/eta';
import type { RankedCandidate } from '../dto/rankedCandidate';
import type { DiscoveryResult } from '../dto/results';
import type { RankingReason } from '../dto/results';
import type { DiscoveryPipelineTelemetry } from './types';

const DEFAULT_QUERY_RADIUS_KM = 10;

const buildEta = (prepTimeMins: number | undefined, distanceKm: number): ETAEstimate | undefined => {
  if (!Number.isFinite(prepTimeMins)) {
    return undefined;
  }

  const deliveryTimeMins = Math.ceil(distanceKm * 3);
  return {
    prepTimeMins: prepTimeMins as number,
    deliveryTimeMins,
    totalMins: (prepTimeMins as number) + deliveryTimeMins,
  };
};

const mapRankingReason = (ranked: RankedCandidate): RankingReason => ({
  score: ranked.score,
  rank: ranked.breakdown.rank,
  factors: ranked.breakdown.factors,
});

export const mapRankedCandidateToNearbyRestaurant = (
  ranked: RankedCandidate
): NearbyRestaurant => {
  const eligible = ranked.candidate;
  const candidate = eligible.candidate;

  return {
    tenantId: candidate.tenantId,
    branchId: candidate.branchId,
    name: candidate.name,
    slug: candidate.slug,
    point: candidate.point,
    distanceKm: eligible.distanceKm,
    geohash: candidate.geohash,
    eligibility: eligible.eligibility,
    eta: buildEta(candidate.prepTimeMins, eligible.distanceKm),
    rating: candidate.rating,
    isOpen: candidate.isOpen === true,
    thumbnailUrl: candidate.thumbnailUrl,
    ranking: mapRankingReason(ranked),
  };
};

export const mapRankedCandidatesToDiscoveryResult = (
  ranked: readonly RankedCandidate[],
  query: DiscoveryQuery,
  repositoryCount: number,
  eligibleCount: number,
  telemetry: DiscoveryPipelineTelemetry
): DiscoveryResult => {
  const limit = Number.isFinite(query.limit) && (query.limit as number) > 0
    ? (query.limit as number)
    : ranked.length;

  const restaurants = ranked
    .slice(0, limit)
    .map(mapRankedCandidateToNearbyRestaurant);

  return {
    restaurants,
    totalCandidates: repositoryCount,
    queryRadiusKm: query.radiusKm ?? DEFAULT_QUERY_RADIUS_KM,
    customerGeohash: query.customerGeohash,
    rankedAt: Date.now(),
    telemetry: {
      ...telemetry,
      counts: {
        ...telemetry.counts,
        returnedCount: restaurants.length,
      },
    },
  };
};
