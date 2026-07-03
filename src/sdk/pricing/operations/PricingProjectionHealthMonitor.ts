/**
 * Pricing projection health monitor (M8 PR-10).
 */

import {
  buildPricingOperationalMetrics,
  evaluatePricingOperationalHealth,
  type PricingOperationalMetrics,
} from '../../../domain/pricing/operations/PricingOperationalRules';
import type { PricingProjectionHealth } from '../../../domain/pricing/operations/PricingProjectionHealth';
import type { PricingOperationalSample } from '../../../domain/pricing/operations/PricingOperationalRules';
import type { PricingOperationalThresholds } from '../../../domain/pricing/operations/PricingOperationalThresholds';
import { DEFAULT_PRICING_OPERATIONAL_THRESHOLDS } from '../../../domain/pricing/operations/PricingOperationalThresholds';

export class PricingProjectionHealthMonitor {
  constructor(
    private readonly thresholds: PricingOperationalThresholds = DEFAULT_PRICING_OPERATIONAL_THRESHOLDS
  ) {}

  metrics(sample: PricingOperationalSample): PricingOperationalMetrics {
    return buildPricingOperationalMetrics(sample);
  }

  health(metrics: PricingOperationalMetrics, driftDetected: boolean): PricingProjectionHealth {
    return evaluatePricingOperationalHealth(metrics, driftDetected, this.thresholds);
  }
}

export function createPricingProjectionHealthMonitor(
  thresholds?: Partial<PricingOperationalThresholds>
): PricingProjectionHealthMonitor {
  return new PricingProjectionHealthMonitor({
    ...DEFAULT_PRICING_OPERATIONAL_THRESHOLDS,
    ...thresholds,
  });
}
