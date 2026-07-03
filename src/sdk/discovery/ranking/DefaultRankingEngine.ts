/**
 * DiscoverySDK — default ranking engine adapter (M3 PR-5).
 */

import { createDiscoveryRankingEngine } from '../../../domain/discovery/ranking/RankingEngine';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { EligibleCandidate } from '../dto/eligibleCandidate';
import type { RankedCandidate } from '../dto/rankedCandidate';
import type { RankingContext, RankingEngine } from './RankingEngine';

export class DefaultRankingEngine implements RankingEngine {
  private readonly engine = createDiscoveryRankingEngine();

  rank(
    candidates: readonly EligibleCandidate[],
    context: RankingContext
  ): SdkResult<readonly RankedCandidate[]> {
    return sdkOk(
      this.engine.rank(candidates, context.query, context.useWeightedRanking)
    );
  }
}

export function createDefaultRankingEngine(): RankingEngine {
  return new DefaultRankingEngine();
}
