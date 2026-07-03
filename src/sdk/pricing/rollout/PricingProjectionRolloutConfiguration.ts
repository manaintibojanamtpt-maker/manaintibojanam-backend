/**
 * Pricing projection rollout configuration (M8 PR-12).
 */

import type { RolloutStageId } from '../../../domain/pricing/rollout/RolloutStage';
import type { RolloutThresholds } from '../../../domain/pricing/rollout/RolloutThresholds';
import { mergeRolloutThresholds } from '../../../domain/pricing/rollout/RolloutThresholds';

export interface PricingProjectionRolloutConfiguration {
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly thresholds: RolloutThresholds;
  readonly updatedAt: string;
}

export const DEFAULT_PRICING_PROJECTION_ROLLOUT_CONFIGURATION: PricingProjectionRolloutConfiguration =
  {
    currentStage: 0,
    manualApprovalGranted: false,
    thresholds: mergeRolloutThresholds(),
    updatedAt: new Date(0).toISOString(),
  };

export function createPricingProjectionRolloutConfiguration(
  overrides: Partial<PricingProjectionRolloutConfiguration> = {}
): PricingProjectionRolloutConfiguration {
  return {
    ...DEFAULT_PRICING_PROJECTION_ROLLOUT_CONFIGURATION,
    ...overrides,
    thresholds: mergeRolloutThresholds(overrides.thresholds),
  };
}
