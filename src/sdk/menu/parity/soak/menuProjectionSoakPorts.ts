/**
 * Menu projection soak ports (M7 PR-9).
 */

import type { SdkAsyncResult } from '../../../core/result';
import type { MenuParityReportRecord } from '../../../../domain/menu/parity/MenuParityResult';
import type { MenuProjectionCertificationReport } from '../../../../domain/menu/parity/soak/MenuProjectionCertificationRules';
import type { MenuProjectionSoakMetrics } from '../../../../domain/menu/parity/soak/MenuProjectionCertificationRules';

export interface MenuParityReportSourcePort {
  listReports(limit: number): SdkAsyncResult<MenuParityReportRecord[]>;
}

export interface MenuProjectionCertificationRepositoryPort {
  save(report: MenuProjectionCertificationReport): SdkAsyncResult<void>;
  getLatest(): SdkAsyncResult<MenuProjectionCertificationReport | null>;
  list(limit: number): SdkAsyncResult<MenuProjectionCertificationReport[]>;
  count(): SdkAsyncResult<number>;
}

export interface MenuProjectionSoakRunResult {
  readonly certification: MenuProjectionCertificationReport;
  readonly reportCount: number;
}

export interface MenuProjectionSoakInfrastructurePort {
  runSoak(limit?: number): SdkAsyncResult<MenuProjectionSoakRunResult>;
  analyze(limit?: number): SdkAsyncResult<MenuProjectionCertificationReport>;
  metrics(limit?: number): SdkAsyncResult<MenuProjectionSoakMetrics>;
}
