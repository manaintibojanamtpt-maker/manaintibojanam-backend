/**
 * Discovery domain — ranking stage (M3 PR-5).
 * EligibleCandidate[] → RankedCandidate[] (deterministic, no Firestore).
 */

import type { DiscoveryQuery } from '../../../sdk/discovery/dto/candidates';
import type { EligibleCandidate } from '../../../sdk/discovery/dto/eligibleCandidate';
import type { RankedCandidate } from '../../../sdk/discovery/dto/rankedCandidate';
import { rankEligibleCandidates } from './RankingMapper';

export class DiscoveryRankingEngine {
  rank(
    candidates: readonly EligibleCandidate[],
    query: DiscoveryQuery,
    useWeightedRanking: boolean
  ): RankedCandidate[] {
    return rankEligibleCandidates(candidates, query, useWeightedRanking);
  }
}

export function createDiscoveryRankingEngine(): DiscoveryRankingEngine {
  return new DiscoveryRankingEngine();
}
