/**
 * EventSDK — parity soak ports (M6 PR-9).
 * Additive contracts — does not modify parity framework.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { OrderParityReportRecord } from '../../../domain/events/parity/order/OrderParityResult';
import type { ParityCertificationReport } from '../../../domain/events/parity/soak/ParityCertificationRules';

export interface ParitySoakReportSourcePort {
  listReports(limit: number): SdkAsyncResult<OrderParityReportRecord[]>;
}

export interface ParityCertificationRepositoryPort {
  save(report: ParityCertificationReport): SdkAsyncResult<void>;
  getLatest(): SdkAsyncResult<ParityCertificationReport | null>;
  list(limit: number): SdkAsyncResult<ParityCertificationReport[]>;
  count(): SdkAsyncResult<number>;
}

export interface ProjectionParitySoakRunResult {
  readonly certification: ParityCertificationReport;
  readonly reportCount: number;
}

export interface ProjectionParitySoakInfrastructurePort {
  runSoak(limit?: number): SdkAsyncResult<ProjectionParitySoakRunResult>;
  analyze(limit?: number): SdkAsyncResult<ParityCertificationReport>;
  metrics(limit?: number): SdkAsyncResult<import('../../../domain/events/parity/soak/ParityCertificationRules').ParitySoakMetrics>;
}
