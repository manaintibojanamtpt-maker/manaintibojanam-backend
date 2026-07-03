/**
 * Projection rollout policy store (M6 PR-12).
 */

import type {
  ProjectionRolloutPolicyPort,
  ProjectionRolloutConfigurationState,
} from './projectionRolloutPorts';
import type { RolloutStageId } from '../../../domain/order/rollout/RolloutStage';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  createProjectionRolloutConfiguration,
  type ProjectionRolloutConfiguration,
} from './ProjectionRolloutConfiguration';

export class ProjectionRolloutPolicy implements ProjectionRolloutPolicyPort {
  private configuration: ProjectionRolloutConfiguration;

  constructor(initial?: Partial<ProjectionRolloutConfiguration>) {
    this.configuration = createProjectionRolloutConfiguration(initial);
  }

  getConfiguration(): SdkAsyncResult<ProjectionRolloutConfigurationState> {
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
  ): SdkAsyncResult<ProjectionRolloutConfigurationState> {
    this.configuration = {
      ...this.configuration,
      currentStage: stage,
      manualApprovalGranted,
      updatedAt: new Date().toISOString(),
    };
    return this.getConfiguration();
  }

  getInternalConfiguration(): ProjectionRolloutConfiguration {
    return this.configuration;
  }
}

export function createProjectionRolloutPolicy(
  initial?: Partial<ProjectionRolloutConfiguration>
): ProjectionRolloutPolicy {
  return new ProjectionRolloutPolicy(initial);
}
