/**
 * Pricing projection soak ports (M8 PR-9).
 */

import type { SdkAsyncResult } from '../../../core/result';
import type { PricingParityReportRecord } from '../../../../domain/pricing/parity/PricingParityResult';
import type { PricingProjectionCertificationReport } from '../../../../domain/pricing/parity/soak/PricingProjectionCertificationRules';
import type { PricingProjectionSoakMetrics } from '../../../../domain/pricing/parity/soak/PricingProjectionCertificationRules';

export interface PricingParityReportSourcePort {
  listReports(limit: number): SdkAsyncResult<PricingParityReportRecord[]>;
}

export interface PricingProjectionCertificationRepositoryPort {
  save(report: PricingProjectionCertificationReport): SdkAsyncResult<void>;
  getLatest(): SdkAsyncResult<PricingProjectionCertificationReport | null>;
  list(limit: number): SdkAsyncResult<PricingProjectionCertificationReport[]>;
  count(): SdkAsyncResult<number>;
}

export interface PricingProjectionSoakRunResult {
  readonly certification: PricingProjectionCertificationReport;
  readonly reportCount: number;
}

export interface PricingProjectionSoakInfrastructurePort {
  runSoak(limit?: number): SdkAsyncResult<PricingProjectionSoakRunResult>;
  analyze(limit?: number): SdkAsyncResult<PricingProjectionCertificationReport>;
  metrics(limit?: number): SdkAsyncResult<PricingProjectionSoakMetrics>;
}
