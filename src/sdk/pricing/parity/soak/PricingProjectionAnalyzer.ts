/**
 * Pricing projection soak analyzer (M8 PR-9).
 */

import type { PricingParityReportRecord } from '../../../../domain/pricing/parity/PricingParityResult';
import type { PricingProjectionSoakThresholds } from '../../../../domain/pricing/parity/soak/PricingProjectionThresholds';
import { mergePricingProjectionSoakThresholds } from '../../../../domain/pricing/parity/soak/PricingProjectionThresholds';
import {
  buildPricingProjectionCertificationReport,
  type PricingProjectionCertificationReport,
} from '../../../../domain/pricing/parity/soak/PricingProjectionCertificationRules';
import { createPricingProjectionMetrics, type PricingProjectionMetrics } from './PricingProjectionMetrics';

export interface PricingProjectionAnalyzerOptions {
  readonly metrics?: PricingProjectionMetrics;
  readonly thresholds?: Partial<PricingProjectionSoakThresholds>;
  readonly certificationIdFactory?: () => string;
  readonly clock?: { now: () => string };
}

export class PricingProjectionAnalyzer {
  private readonly metrics: PricingProjectionMetrics;
  private readonly thresholds: PricingProjectionSoakThresholds;
  private readonly certificationIdFactory: () => string;
  private readonly clock: { now: () => string };

  constructor(options: PricingProjectionAnalyzerOptions = {}) {
    this.metrics = options.metrics ?? createPricingProjectionMetrics();
    this.thresholds = mergePricingProjectionSoakThresholds(options.thresholds);
    this.certificationIdFactory =
      options.certificationIdFactory ?? (() => `pricing-cert-${Date.now()}`);
    this.clock = options.clock ?? { now: () => new Date().toISOString() };
  }

  analyze(reports: readonly PricingParityReportRecord[]): PricingProjectionCertificationReport {
    const input = this.metrics.buildInput(reports);
    return buildPricingProjectionCertificationReport(
      this.certificationIdFactory(),
      input,
      this.clock.now(),
      this.thresholds
    );
  }
}

export function createPricingProjectionAnalyzer(
  options?: PricingProjectionAnalyzerOptions
): PricingProjectionAnalyzer {
  return new PricingProjectionAnalyzer(options);
}
