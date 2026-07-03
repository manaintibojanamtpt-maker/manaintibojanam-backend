/**
 * Pricing projection drift detector (M8 PR-10).
 */

import {
  detectPricingProjectionDrift,
  type PricingProjectionDriftReport,
  type PricingProjectionDriftSample,
} from '../../../domain/pricing/operations/PricingProjectionDrift';
import type { PricingOperationalSample } from '../../../domain/pricing/operations/PricingOperationalRules';
import type { PricingOperationalThresholds } from '../../../domain/pricing/operations/PricingOperationalThresholds';
import { DEFAULT_PRICING_OPERATIONAL_THRESHOLDS } from '../../../domain/pricing/operations/PricingOperationalThresholds';

export class PricingProjectionDriftDetector {
  constructor(
    private readonly thresholds: PricingOperationalThresholds = DEFAULT_PRICING_OPERATIONAL_THRESHOLDS
  ) {}

  detect(sample: PricingOperationalSample): PricingProjectionDriftReport {
    const driftSample: PricingProjectionDriftSample = {
      projectionName: sample.projectionName,
      processedEvents: sample.processedEvents,
      duplicateEvents: sample.duplicateEvents,
      droppedEvents: sample.droppedEvents,
      missingEvents: sample.missingEvents,
      outOfOrderEvents: sample.outOfOrderEvents,
    };
    return detectPricingProjectionDrift(
      driftSample,
      this.thresholds.maxDuplicatePercent,
      this.thresholds.maxDroppedEventPercent,
      this.thresholds.maxCriticalDriftCount
    );
  }
}

export function createPricingProjectionDriftDetector(
  thresholds?: Partial<PricingOperationalThresholds>
): PricingProjectionDriftDetector {
  return new PricingProjectionDriftDetector({
    ...DEFAULT_PRICING_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
