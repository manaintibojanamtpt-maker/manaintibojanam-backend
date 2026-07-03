/**
 * Search domain — composite score computation (M4 PR-2).
 */

import type { SearchMatchType } from '../shared/SearchMatchType';
import { SEARCH_MATCH_TYPE_SIGNALS } from '../shared/SearchMatchType';
import type { ComputedSearchScore, SearchRankingSignals, SearchScoreFactor } from '../shared/types';
import { ACTIVE_SEARCH_WEIGHT_KEYS, SEARCH_DOMAIN_WEIGHTS } from './SearchWeights';

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const DEFAULT_MAX_DISTANCE_KM = 15;

export function normalizeDistanceSignal(distanceKm: number, maxDistanceKm: number = DEFAULT_MAX_DISTANCE_KM): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return 0;
  }
  if (distanceKm >= maxDistanceKm) {
    return 0;
  }
  return clamp01(1 - distanceKm / maxDistanceKm);
}

export function normalizePopularitySignal(rating?: number, isPopular?: boolean): number {
  const ratingSignal = rating !== undefined && Number.isFinite(rating) ? clamp01(rating / 5) : 0;
  const popularBoost = isPopular ? 0.15 : 0;
  return clamp01(ratingSignal + popularBoost);
}

export function matchTypeToSignals(matchType: SearchMatchType): Pick<
  SearchRankingSignals,
  'exactMatch' | 'prefixMatch' | 'containsMatch'
> {
  return {
    exactMatch: matchType === 'exact' ? SEARCH_MATCH_TYPE_SIGNALS.exact : 0,
    prefixMatch: matchType === 'prefix' ? SEARCH_MATCH_TYPE_SIGNALS.prefix : 0,
    containsMatch: matchType === 'contains' ? SEARCH_MATCH_TYPE_SIGNALS.contains : 0,
  };
}

export function buildSearchRankingSignals(input: {
  readonly matchType: SearchMatchType;
  readonly rating?: number;
  readonly isPopular?: boolean;
  readonly distanceKm?: number;
  readonly discoveryRankScore?: number;
  readonly maxDistanceKm?: number;
}): SearchRankingSignals {
  const matchSignals = matchTypeToSignals(input.matchType);

  return {
    ...matchSignals,
    popularity: normalizePopularitySignal(input.rating, input.isPopular),
    distance: normalizeDistanceSignal(input.distanceKm ?? Number.POSITIVE_INFINITY, input.maxDistanceKm),
    discoveryRank: clamp01(input.discoveryRankScore ?? 0),
  };
}

const FACTOR_LABELS: Record<keyof SearchRankingSignals, string> = {
  exactMatch: 'Exact text match',
  prefixMatch: 'Prefix text match',
  containsMatch: 'Contains text match',
  popularity: 'Popularity signal',
  distance: 'Distance proximity',
  discoveryRank: 'Discovery rank score',
};

export function computeSearchScore(signals: SearchRankingSignals): ComputedSearchScore {
  const factors: SearchScoreFactor[] = ACTIVE_SEARCH_WEIGHT_KEYS.map((key) => {
    const weight = SEARCH_DOMAIN_WEIGHTS[key];
    const signal = clamp01(signals[key]);
    return {
      factor: key,
      weight,
      signal,
      contribution: weight * signal,
      label: FACTOR_LABELS[key],
    };
  });

  const score = factors.reduce((sum, factor) => sum + factor.contribution, 0);

  return {
    score: clamp01(score),
    factors,
  };
}

/** @deprecated Use computeSearchScore — alias for spec naming */
export const SearchScore = {
  buildSignals: buildSearchRankingSignals,
  compute: computeSearchScore,
  normalizeDistance: normalizeDistanceSignal,
  normalizePopularity: normalizePopularitySignal,
};
