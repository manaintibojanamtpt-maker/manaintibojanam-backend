/**
 * EventSDK — projection operational ports (M6 PR-10).
 * Additive contracts — does not modify frozen SDKs or parity framework.
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  ProjectionOperationalReport,
  ProjectionOperationalSample,
} from '../../../domain/events/operations/ProjectionOperationalRules';
import type { ProjectionLagMetrics } from '../../../domain/events/operations/ProjectionLag';
import type { ProjectionOperationalHealth } from '../../../domain/events/operations/ProjectionHealth';

export interface ProjectionOperationalSampleSourcePort {
  listSamples(limit: number): SdkAsyncResult<ProjectionOperationalSample[]>;
}

export interface ProjectionOperationalRepositoryPort {
  save(report: ProjectionOperationalReport): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<ProjectionOperationalReport | null>;
  list(projectionName: string, limit: number): SdkAsyncResult<ProjectionOperationalReport[]>;
  count(): SdkAsyncResult<number>;
}

export interface ProjectionLagRepositoryPort {
  save(metrics: ProjectionLagMetrics): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<ProjectionLagMetrics | null>;
  getMaximumLag(projectionName: string): SdkAsyncResult<number>;
}

export interface ProjectionHealthRepositoryPort {
  save(snapshot: ProjectionOperationalHealthSnapshot): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<ProjectionOperationalHealthSnapshot | null>;
  list(limit: number): SdkAsyncResult<ProjectionOperationalHealthSnapshot[]>;
}

export interface ProjectionOperationalHealthSnapshot {
  readonly snapshotId: string;
  readonly projectionName: string;
  readonly health: ProjectionOperationalHealth;
  readonly readiness: import('../../../domain/events/operations/ProjectionOperationalRules').ProjectionOperationalReadiness;
  readonly capturedAt: string;
}

export interface ProjectionOperationalValidationResult {
  readonly report: ProjectionOperationalReport;
  readonly lag: ProjectionLagMetrics;
  readonly driftDetected: boolean;
  readonly replayVerified: boolean;
}

export interface ProjectionOperationalInfrastructurePort {
  validate(projectionName: string, limit?: number): SdkAsyncResult<ProjectionOperationalValidationResult>;
  dashboard(projectionName: string): SdkAsyncResult<ProjectionOperationalHealthSnapshot | null>;
}
