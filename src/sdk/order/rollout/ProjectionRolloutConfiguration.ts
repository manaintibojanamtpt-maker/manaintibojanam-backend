/**
 * Projection rollout configuration (M6 PR-12).
 */

import type { RolloutStageId } from '../../../domain/order/rollout/RolloutStage';
import type { RolloutThresholds } from '../../../domain/order/rollout/RolloutThresholds';
import { mergeRolloutThresholds } from '../../../domain/order/rollout/RolloutThresholds';

export interface ProjectionRolloutConfiguration {
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly thresholds: RolloutThresholds;
  readonly updatedAt: string;
}

export const DEFAULT_PROJECTION_ROLLOUT_CONFIGURATION: ProjectionRolloutConfiguration = {
  currentStage: 0,
  manualApprovalGranted: false,
  thresholds: mergeRolloutThresholds(),
  updatedAt: new Date(0).toISOString(),
};

export function createProjectionRolloutConfiguration(
  overrides: Partial<ProjectionRolloutConfiguration> = {}
): ProjectionRolloutConfiguration {
  return {
    ...DEFAULT_PROJECTION_ROLLOUT_CONFIGURATION,
    ...overrides,
    thresholds: mergeRolloutThresholds(overrides.thresholds),
  };
}
