/**
 * Discovery domain — maps scored entries to RankedCandidate (M3 PR-5).
 */

import type { DiscoveryQuery } from '../../../sdk/discovery/dto/candidates';
import type { EligibleCandidate } from '../../../sdk/discovery/dto/eligibleCandidate';
import type { RankedCandidate, RankingBreakdown } from '../../../sdk/discovery/dto/rankedCandidate';
import type { RankingFactor } from '../../../sdk/discovery/dto/results';
import {
  DISCOVERY_RANKING_ALGORITHM_VERSION,
  DISCOVERY_RANKING_VERSION,
} from './RankingVersion';
import {
  computeBatchMaxDistanceKm,
  computeRankingSignals,
} from './RankingSignals';
import { resolveRankingPolicy, type RankingPolicy } from './RankingPolicy';

interface ScoredEligibleCandidate {
  readonly entry: EligibleCandidate;
  readonly score: number;
  readonly signals: ReturnType<typeof computeRankingSignals>;
  readonly factors: RankingFactor[];
  readonly policy: RankingPolicy;
}

const compareRankedEntries = (left: ScoredEligibleCandidate, right: ScoredEligibleCandidate): number => {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (left.entry.distanceKm !== right.entry.distanceKm) {
    return left.entry.distanceKm - right.entry.distanceKm;
  }

  return String(left.entry.candidate.tenantId).localeCompare(
    String(right.entry.candidate.tenantId)
  );
};

const buildReasons = (factors: readonly RankingFactor[], policyId: string): string[] => {
  const sorted = [...factors].sort((a, b) => b.contribution - a.contribution);
  const top = sorted.slice(0, 3).filter((factor) => factor.contribution > 0);

  if (!top.length) {
    return [`Ranked using ${policyId}`];
  }

  return top.map(
    (factor) =>
      `${factor.factor} contributed ${(factor.contribution * 100).toFixed(1)}% (signal ${factor.signal.toFixed(2)})`
  );
};

const toRankedCandidate = (
  scored: ScoredEligibleCandidate,
  rank: number
): RankedCandidate => {
  const breakdown: RankingBreakdown = {
    weightedScore: scored.score,
    rank,
    policy: scored.policy.id,
    factors: scored.factors,
  };

  return {
    candidate: scored.entry,
    score: scored.score,
    breakdown,
    reasons: buildReasons(scored.factors, scored.policy.id),
    algorithmVersion: DISCOVERY_RANKING_ALGORITHM_VERSION,
    rankingVersion: DISCOVERY_RANKING_VERSION,
  };
};

export function rankEligibleCandidates(
  candidates: readonly EligibleCandidate[],
  query: DiscoveryQuery,
  useWeightedRanking: boolean
): RankedCandidate[] {
  const eligible = candidates.filter((entry) => entry.isEligible);
  if (!eligible.length) {
    return [];
  }

  const policy = resolveRankingPolicy(useWeightedRanking);
  const maxDistanceKm = computeBatchMaxDistanceKm(eligible);

  const scored: ScoredEligibleCandidate[] = eligible.map((entry) => {
    const signals = computeRankingSignals(entry, query, maxDistanceKm);
    const score = policy.computeScore(signals);
    const factors = policy.buildFactors(signals, score);
    return { entry, score, signals, factors, policy };
  });

  const sorted = [...scored].sort(compareRankedEntries);

  return sorted.map((item, index) => toRankedCandidate(item, index + 1));
}
