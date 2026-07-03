/**
 * Menu operational ports (M7 PR-10).
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  MenuOperationalReport,
  MenuOperationalSample,
  MenuOperationalReadiness,
} from '../../../domain/menu/operations/MenuOperationalRules';
import type { MenuProjectionLagMetrics } from '../../../domain/menu/operations/MenuProjectionLag';
import type { MenuProjectionHealth } from '../../../domain/menu/operations/MenuProjectionHealth';

export interface MenuOperationalSampleSourcePort {
  listSamples(limit: number): SdkAsyncResult<MenuOperationalSample[]>;
}

export interface MenuOperationalRepositoryPort {
  save(report: MenuOperationalReport): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<MenuOperationalReport | null>;
  list(projectionName: string, limit: number): SdkAsyncResult<MenuOperationalReport[]>;
  count(): SdkAsyncResult<number>;
}

export interface MenuLagRepositoryPort {
  save(metrics: MenuProjectionLagMetrics): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<MenuProjectionLagMetrics | null>;
  getMaximumLag(projectionName: string): SdkAsyncResult<number>;
}

export interface MenuHealthRepositoryPort {
  save(snapshot: MenuOperationalHealthSnapshot): SdkAsyncResult<void>;
  getLatest(projectionName: string): SdkAsyncResult<MenuOperationalHealthSnapshot | null>;
  list(limit: number): SdkAsyncResult<MenuOperationalHealthSnapshot[]>;
}

export interface MenuOperationalHealthSnapshot {
  readonly snapshotId: string;
  readonly projectionName: string;
  readonly health: MenuProjectionHealth;
  readonly readiness: MenuOperationalReadiness;
  readonly capturedAt: string;
}

export interface MenuOperationalValidationResult {
  readonly report: MenuOperationalReport;
  readonly lag: MenuProjectionLagMetrics;
  readonly driftDetected: boolean;
  readonly replayVerified: boolean;
}

export interface MenuOperationalInfrastructurePort {
  validate(projectionName: string, limit?: number): SdkAsyncResult<MenuOperationalValidationResult>;
  dashboard(projectionName: string): SdkAsyncResult<MenuOperationalHealthSnapshot | null>;
}
