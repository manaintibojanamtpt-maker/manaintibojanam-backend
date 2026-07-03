/**
 * Pricing lag analyzer (M8 PR-10).
 */

import {
  buildPricingProjectionLagMetrics,
  type PricingProjectionLagMetrics,
  type PricingProjectionLagSample,
} from '../../../domain/pricing/operations/PricingProjectionLag';
import type { PricingOperationalSample } from '../../../domain/pricing/operations/PricingOperationalRules';

export class PricingLagAnalyzer {
  analyze(sample: PricingOperationalSample, historicalMaximumLagMs = 0): PricingProjectionLagMetrics {
    const lagSample: PricingProjectionLagSample = {
      projectionName: sample.projectionName,
      lastEventProcessedAt: sample.lastEventProcessedAt,
      evaluatedAt: sample.evaluatedAt,
      checkpointUpdatedAt: sample.checkpointUpdatedAt,
    };
    return buildPricingProjectionLagMetrics(lagSample, historicalMaximumLagMs);
  }
}

export function createPricingLagAnalyzer(): PricingLagAnalyzer {
  return new PricingLagAnalyzer();
}
