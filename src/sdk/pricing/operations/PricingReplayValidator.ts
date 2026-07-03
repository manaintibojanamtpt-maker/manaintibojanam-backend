/**
 * Pricing replay validator (M8 PR-10).
 */

import {
  evaluatePricingReplayHealth,
  type PricingReplayHealth,
} from '../../../domain/pricing/operations/PricingReplayHealth';
import type { PricingOperationalSample } from '../../../domain/pricing/operations/PricingOperationalRules';
import type { PricingOperationalThresholds } from '../../../domain/pricing/operations/PricingOperationalThresholds';
import { DEFAULT_PRICING_OPERATIONAL_THRESHOLDS } from '../../../domain/pricing/operations/PricingOperationalThresholds';

export class PricingReplayValidator {
  constructor(
    private readonly thresholds: PricingOperationalThresholds = DEFAULT_PRICING_OPERATIONAL_THRESHOLDS
  ) {}

  validate(sample: PricingOperationalSample): PricingReplayHealth {
    return evaluatePricingReplayHealth(
      {
        projectionName: sample.projectionName,
        replayAttempts: sample.replayAttempts,
        replaySuccesses: sample.replaySuccesses,
      },
      this.thresholds.minReplaySuccessPercent
    );
  }
}

export function createPricingReplayValidator(
  thresholds?: Partial<PricingOperationalThresholds>
): PricingReplayValidator {
  return new PricingReplayValidator({
    ...DEFAULT_PRICING_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
