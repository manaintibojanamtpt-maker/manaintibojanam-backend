/**
 * Menu projection rollout policy store (M7 PR-12).
 */

import type {
  MenuProjectionRolloutPolicyPort,
  MenuProjectionRolloutConfigurationState,
} from './projectionRolloutPorts';
import type { RolloutStageId } from '../../../domain/menu/rollout/RolloutStage';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  createMenuProjectionRolloutConfiguration,
  type MenuProjectionRolloutConfiguration,
} from './ProjectionRolloutConfiguration';

export class MenuProjectionRolloutPolicy implements MenuProjectionRolloutPolicyPort {
  private configuration: MenuProjectionRolloutConfiguration;

  constructor(initial?: Partial<MenuProjectionRolloutConfiguration>) {
    this.configuration = createMenuProjectionRolloutConfiguration(initial);
  }

  getConfiguration(): SdkAsyncResult<MenuProjectionRolloutConfigurationState> {
    return Promise.resolve(
      sdkOk({
        currentStage: this.configuration.currentStage,
        manualApprovalGranted: this.configuration.manualApprovalGranted,
        updatedAt: this.configuration.updatedAt,
      })
    );
  }

  setStage(
    stage: RolloutStageId,
    manualApprovalGranted: boolean
  ): SdkAsyncResult<MenuProjectionRolloutConfigurationState> {
    this.configuration = {
      ...this.configuration,
      currentStage: stage,
      manualApprovalGranted,
      updatedAt: new Date().toISOString(),
    };
    return this.getConfiguration();
  }

  getInternalConfiguration(): MenuProjectionRolloutConfiguration {
    return this.configuration;
  }
}

export function createProjectionRolloutPolicy(
  initial?: Partial<MenuProjectionRolloutConfiguration>
): MenuProjectionRolloutPolicy {
  return new MenuProjectionRolloutPolicy(initial);
}
