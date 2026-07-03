/**
 * Pricing operational ports (M8 PR-10).
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  PricingOperationalReport,
  PricingOperationalSample,
  PricingOperationalReadiness,
} from '../../../domain/pricing/operations/PricingOperationalRules';
import type { PricingProjectionLagMetrics } from '../../../domain/pricing/operations/PricingProjectionLag';
import type { PricingProjectionHealth } from '../../../domain/pricing/operations/PricingProjectionHealth';

export interface PricingOperationalSampleSourcePort {
  listSamples(limit: number): SdkAsyncResult<PricingOperationalSample[]>;
}

export interface PricingOperationalRepositoryPort {
  save(report: PricingOperationalReport): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<PricingOperationalReport | null>;
  list(projectionName: string, limit: number): SdkAsyncResult<PricingOperationalReport[]>;
  count(): SdkAsyncResult<number>;
}

export interface PricingLagRepositoryPort {
  save(metrics: PricingProjectionLagMetrics): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<PricingProjectionLagMetrics | null>;
  getMaximumLag(projectionName: string): SdkAsyncResult<number>;
}

export interface PricingHealthRepositoryPort {
  save(snapshot: PricingOperationalHealthSnapshot): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<PricingOperationalHealthSnapshot | null>;
  list(limit: number): SdkAsyncResult<PricingOperationalHealthSnapshot[]>;
}

export interface PricingOperationalHealthSnapshot {
  readonly snapshotId: string;
  readonly projectionName: string;
  readonly health: PricingProjectionHealth;
  readonly readiness: PricingOperationalReadiness;
  readonly capturedAt: string;
}

export interface PricingOperationalValidationResult {
  readonly report: PricingOperationalReport;
  readonly lag: PricingProjectionLagMetrics;
  readonly driftDetected: boolean;
  readonly replayVerified: boolean;
}

export interface PricingOperationalInfrastructurePort {
  validate(
    projectionName: string,
    limit?: number
  ): SdkAsyncResult<PricingOperationalValidationResult>;
  dashboard(projectionName: string): SdkAsyncResult<PricingOperationalHealthSnapshot | null>;
}
