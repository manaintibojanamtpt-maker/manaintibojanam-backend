/**
 * Menu projection rollout configuration (M7 PR-12).
 */

import type { RolloutStageId } from '../../../domain/menu/rollout/RolloutStage';
import type { RolloutThresholds } from '../../../domain/menu/rollout/RolloutThresholds';
import { mergeRolloutThresholds } from '../../../domain/menu/rollout/RolloutThresholds';

export interface MenuProjectionRolloutConfiguration {
  readonly currentStage: RolloutStageId;
  readonly manualApprovalGranted: boolean;
  readonly thresholds: RolloutThresholds;
  readonly updatedAt: string;
}

export const DEFAULT_MENU_PROJECTION_ROLLOUT_CONFIGURATION: MenuProjectionRolloutConfiguration = {
  currentStage: 0,
  manualApprovalGranted: false,
  thresholds: mergeRolloutThresholds(),
  updatedAt: new Date(0).toISOString(),
};

export function createMenuProjectionRolloutConfiguration(
  overrides: Partial<MenuProjectionRolloutConfiguration> = {}
): MenuProjectionRolloutConfiguration {
  return {
    ...DEFAULT_MENU_PROJECTION_ROLLOUT_CONFIGURATION,
    ...overrides,
    thresholds: mergeRolloutThresholds(overrides.thresholds),
  };
}
