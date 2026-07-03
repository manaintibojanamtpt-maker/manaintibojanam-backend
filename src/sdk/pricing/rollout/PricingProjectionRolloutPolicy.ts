/**
 * Pricing projection rollout policy store (M8 PR-12).
 */

import type {
  PricingProjectionRolloutPolicyPort,
  PricingProjectionRolloutConfigurationState,
} from './pricingProjectionRolloutPorts';
import type { RolloutStageId } from '../../../domain/pricing/rollout/RolloutStage';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  createPricingProjectionRolloutConfiguration,
  type PricingProjectionRolloutConfiguration,
} from './PricingProjectionRolloutConfiguration';

export class PricingProjectionRolloutPolicy implements PricingProjectionRolloutPolicyPort {
  private configuration: PricingProjectionRolloutConfiguration;

  constructor(initial?: Partial<PricingProjectionRolloutConfiguration>) {
    this.configuration = createPricingProjectionRolloutConfiguration(initial);
  }

  getConfiguration(): SdkAsyncResult<PricingProjectionRolloutConfigurationState> {
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
  ): SdkAsyncResult<PricingProjectionRolloutConfigurationState> {
    this.configuration = {
      ...this.configuration,
      currentStage: stage,
      manualApprovalGranted,
      updatedAt: new Date().toISOString(),
    };
    return this.getConfiguration();
  }

  getInternalConfiguration(): PricingProjectionRolloutConfiguration {
    return this.configuration;
  }
}

export function createPricingProjectionRolloutPolicy(
  initial?: Partial<PricingProjectionRolloutConfiguration>
): PricingProjectionRolloutPolicy {
  return new PricingProjectionRolloutPolicy(initial);
}
