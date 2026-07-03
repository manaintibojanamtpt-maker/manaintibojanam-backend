/**
 * DiscoverySDK — ranking engine port (M3 PR-5).
 */

import type { SdkResult } from '../../core/result';
import type { DiscoveryQuery } from '../dto/candidates';
import type { EligibleCandidate } from '../dto/eligibleCandidate';
import type { RankedCandidate } from '../dto/rankedCandidate';

export interface RankingContext {
  readonly query: DiscoveryQuery;
  readonly useWeightedRanking: boolean;
}

export interface RankingEngine {
  rank(
    candidates: readonly EligibleCandidate[],
    context: RankingContext
  ): SdkResult<readonly RankedCandidate[]>;
}

/** Default weight constants — documented in docs/m3/DISCOVERY-INTELLIGENCE-PLATFORM.md §6 */
export const DISCOVERY_RANKING_WEIGHTS = {
  distance: 0.3,
  deliveryRadius: 0.2,
  kitchenOpen: 0.15,
  storeAvailability: 0.1,
  preparationTime: 0.08,
  deliveryEta: 0.07,
  cuisineMatch: 0.05,
  rating: 0.05,
  promoted: 0,
  aiRecommendation: 0,
} as const;

export type DiscoveryRankingWeightKey = keyof typeof DISCOVERY_RANKING_WEIGHTS;
