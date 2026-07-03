/**
 * Discovery domain — ranking weight validation (M3 PR-5).
 */

import { DISCOVERY_RANKING_WEIGHTS } from '../../../sdk/discovery/ranking/RankingEngine';

export type ActiveRankingWeightKey =
  | 'distance'
  | 'deliveryRadius'
  | 'kitchenOpen'
  | 'storeAvailability'
  | 'preparationTime'
  | 'deliveryEta'
  | 'cuisineMatch'
  | 'rating';

export const ACTIVE_RANKING_WEIGHT_KEYS: readonly ActiveRankingWeightKey[] = [
  'distance',
  'deliveryRadius',
  'kitchenOpen',
  'storeAvailability',
  'preparationTime',
  'deliveryEta',
  'cuisineMatch',
  'rating',
] as const;

export const RANKING_WEIGHTS = DISCOVERY_RANKING_WEIGHTS;

export function sumActiveRankingWeights(
  weights: Pick<typeof DISCOVERY_RANKING_WEIGHTS, ActiveRankingWeightKey> = DISCOVERY_RANKING_WEIGHTS
): number {
  return ACTIVE_RANKING_WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

export function validateRankingWeights(
  weights: Pick<typeof DISCOVERY_RANKING_WEIGHTS, ActiveRankingWeightKey> = DISCOVERY_RANKING_WEIGHTS
): boolean {
  const total = sumActiveRankingWeights(weights);
  return Math.abs(total - 1) < 0.0001;
}
