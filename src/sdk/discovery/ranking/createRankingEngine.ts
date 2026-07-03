/**
 * DiscoverySDK — ranking engine factory (M3 PR-5).
 */

import {
  readDiscoveryFlagDefault,
  type DiscoveryFeatureFlagReader,
} from '../core/featureFlags';
import type { CreateDiscoverySDKOptions } from '../shared/options';
import { createDefaultRankingEngine } from './DefaultRankingEngine';
import type { RankingEngine } from './RankingEngine';

export function resolveRankingEngine(
  options?: CreateDiscoverySDKOptions
): RankingEngine {
  if (options?.rankingEngine) {
    return options.rankingEngine;
  }

  return createDefaultRankingEngine();
}

export function resolveUseWeightedRanking(
  options?: CreateDiscoverySDKOptions
): boolean {
  const readFlag: DiscoveryFeatureFlagReader =
    options?.featureFlags ?? readDiscoveryFlagDefault;

  return readFlag('FF_DISCOVERY_RANKING_ENABLED');
}
