/**
 * Discovery domain — ranking policy definitions (M3 PR-5).
 */

import type { RankingPolicyId } from '../../../sdk/discovery/dto/rankedCandidate';
import type { RankingFactor } from '../../../sdk/discovery/dto/results';
import { DISCOVERY_RANKING_WEIGHTS } from '../../../sdk/discovery/ranking/RankingEngine';
import type { ActiveRankingWeightKey } from './RankingWeights';
import { ACTIVE_RANKING_WEIGHT_KEYS } from './RankingWeights';

export interface RankingSignals {
  readonly distance: number;
  readonly deliveryRadius: number;
  readonly kitchenOpen: number;
  readonly storeAvailability: number;
  readonly preparationTime: number;
  readonly deliveryEta: number;
  readonly cuisineMatch: number;
  readonly rating: number;
}

export interface RankingPolicy {
  readonly id: RankingPolicyId;
  computeScore(signals: RankingSignals): number;
  buildFactors(signals: RankingSignals, score: number): RankingFactor[];
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const buildWeightedFactors = (
  signals: RankingSignals,
  score: number,
  weightKeys: readonly ActiveRankingWeightKey[]
): RankingFactor[] =>
  weightKeys.map((key) => {
    const weight = DISCOVERY_RANKING_WEIGHTS[key];
    const signal = signals[key];
    return {
      factor: key,
      weight,
      signal,
      contribution: weight * signal,
    };
  }).filter((factor) => factor.weight > 0);

export const weightedRankingPolicy: RankingPolicy = {
  id: 'weighted-v1',
  computeScore(signals: RankingSignals): number {
    return ACTIVE_RANKING_WEIGHT_KEYS.reduce(
      (sum, key) => sum + DISCOVERY_RANKING_WEIGHTS[key] * signals[key],
      0
    );
  },
  buildFactors(signals: RankingSignals, score: number): RankingFactor[] {
    return buildWeightedFactors(signals, score, ACTIVE_RANKING_WEIGHT_KEYS);
  },
};

export const distanceOnlyRankingPolicy: RankingPolicy = {
  id: 'distance-only-v1',
  computeScore(signals: RankingSignals): number {
    return signals.distance;
  },
  buildFactors(signals: RankingSignals, score: number): RankingFactor[] {
    return [
      {
        factor: 'distance',
        weight: 1,
        signal: signals.distance,
        contribution: score,
      },
    ];
  },
};

export function resolveRankingPolicy(useWeightedRanking: boolean): RankingPolicy {
  return useWeightedRanking ? weightedRankingPolicy : distanceOnlyRankingPolicy;
}

export function normalizeDistanceSignal(distanceKm: number, maxDistanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (maxDistanceKm <= 0) return 1;
  return clamp01(1 - distanceKm / maxDistanceKm);
}

export function normalizeRadiusHeadroomSignal(
  distanceKm: number,
  maxRadiusKm: number | undefined
): number {
  if (!Number.isFinite(maxRadiusKm) || (maxRadiusKm as number) <= 0) return 0;
  return clamp01(1 - distanceKm / (maxRadiusKm as number));
}

export function normalizePrepTimeSignal(prepTimeMins: number | undefined): number {
  if (!Number.isFinite(prepTimeMins)) return 0.5;
  return clamp01(1 - (prepTimeMins as number) / 60);
}

export function normalizeEtaSignal(prepTimeMins: number | undefined, distanceKm: number): number {
  const prep = Number.isFinite(prepTimeMins) ? (prepTimeMins as number) : 30;
  const etaMins = prep + distanceKm * 3;
  return clamp01(1 - etaMins / 90);
}

export function normalizeCuisineMatchSignal(
  candidateTags: readonly string[] | undefined,
  queryTags: readonly string[] | undefined
): number {
  if (!queryTags?.length) return 0.5;
  const normalizedQuery = queryTags.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  if (!normalizedQuery.length) return 0.5;

  const candidateSet = new Set(
    (candidateTags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)
  );
  const matches = normalizedQuery.filter((tag) => candidateSet.has(tag)).length;
  return clamp01(matches / normalizedQuery.length);
}

export function normalizeRatingSignal(rating: number | undefined): number {
  if (!Number.isFinite(rating)) return 0.5;
  return clamp01((rating as number) / 5);
}
