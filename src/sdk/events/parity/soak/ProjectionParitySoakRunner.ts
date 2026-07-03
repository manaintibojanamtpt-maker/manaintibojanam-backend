/**
 * Projection parity soak runner (M6 PR-9).
 * Consumes parity reports and produces certification metrics only.
 */

import type {
  ParitySoakReportSourcePort,
  ParityCertificationRepositoryPort,
  ProjectionParitySoakRunResult,
} from '../../contracts/paritySoakPorts';
import type { ClockPort } from '../../contracts/ports';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../../core/featureFlags';
import { eventNotConfiguredAsync } from '../../adapters/notConfigured';
import type { OrderParityReportRecord } from '../../../../domain/events/parity/order/OrderParityResult';
import type { ParityCertificationReport } from '../../../../domain/events/parity/soak/ParityCertificationRules';
import { createProjectionParityAnalyzer, type ProjectionParityAnalyzer } from './ProjectionParityAnalyzer';
import { createProjectionParityMetrics, type ProjectionParityMetrics } from './ProjectionParityMetrics';
import type { ProjectionParitySoakTelemetryHook } from './ProjectionParityTelemetry';
import { createProjectionParitySoakTelemetryEmitter } from './ProjectionParityTelemetry';

export interface ProjectionParitySoakRunnerOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly reportSource: ParitySoakReportSourcePort;
  readonly certificationRepository?: ParityCertificationRepositoryPort;
  readonly analyzer?: ProjectionParityAnalyzer;
  readonly metrics?: ProjectionParityMetrics;
  readonly clock?: ClockPort;
  readonly onTelemetry?: ProjectionParitySoakTelemetryHook;
  readonly defaultLimit?: number;
}

export class ProjectionParitySoakRunner {
  private readonly analyzer: ProjectionParityAnalyzer;
  private readonly metrics: ProjectionParityMetrics;
  private readonly defaultLimit: number;

  constructor(private readonly options: ProjectionParitySoakRunnerOptions) {
    this.analyzer = options.analyzer ?? createProjectionParityAnalyzer({ clock: options.clock });
    this.metrics = options.metrics ?? createProjectionParityMetrics();
    this.defaultLimit = options.defaultLimit ?? 1000;
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_RUNTIME_ENABLED') &&
      readFlag('FF_ORDER_READ_PROJECTION_ENABLED') &&
      readFlag('FF_ORDER_PROJECTION_PARITY_ENABLED') &&
      readFlag('FF_ORDER_PROJECTION_SOAK_ENABLED')
    );
  }

  private async loadReports(limit: number): SdkAsyncResult<OrderParityReportRecord[]> {
    return this.options.reportSource.listReports(limit);
  }

  async analyze(limit = this.defaultLimit): SdkAsyncResult<ParityCertificationReport> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('analyze', 'ProjectionParitySoakRunner');
    }

    const telemetry = createProjectionParitySoakTelemetryEmitter(
      this.options.onTelemetry,
      'analyze'
    );
    telemetry.soakStarted(limit);

    const loaded = await this.loadReports(limit);
    if (!loaded.ok) {
      telemetry.soakFailed(loaded.error.code);
      return loaded;
    }

    const certification = this.analyzer.analyze(loaded.value);
    telemetry.readinessGenerated(certification.health.status, certification.readiness.certification);
    telemetry.certificationGenerated(certification.health.status, certification.readiness.certification);
    telemetry.soakCompleted(loaded.value.length);
    return sdkOk(certification);
  }

  async runSoak(limit = this.defaultLimit): SdkAsyncResult<ProjectionParitySoakRunResult> {
    const analyzed = await this.analyze(limit);
    if (!analyzed.ok) return analyzed;

    if (this.options.certificationRepository) {
      await this.options.certificationRepository.save(analyzed.value);
    }

    const loaded = await this.loadReports(limit);
    const reportCount = loaded.ok ? loaded.value.length : 0;

    return sdkOk({
      certification: analyzed.value,
      reportCount,
    });
  }

  async metricsOnly(limit = this.defaultLimit): SdkAsyncResult<
    import('../../../../domain/events/parity/soak/ParityCertificationRules').ParitySoakMetrics
  > {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('metricsOnly', 'ProjectionParitySoakRunner');
    }

    const loaded = await this.loadReports(limit);
    if (!loaded.ok) return loaded;
    return sdkOk(this.metrics.aggregate(loaded.value));
  }
}

export function createProjectionParitySoakRunner(
  options: ProjectionParitySoakRunnerOptions
): ProjectionParitySoakRunner {
  return new ProjectionParitySoakRunner(options);
}

export class InMemoryParitySoakReportSource implements ParitySoakReportSourcePort {
  private readonly reports: OrderParityReportRecord[] = [];

  seed(report: OrderParityReportRecord): void {
    this.reports.push(report);
  }

  seedMany(reports: readonly OrderParityReportRecord[]): void {
    this.reports.push(...reports);
  }

  listReports(limit: number): SdkAsyncResult<OrderParityReportRecord[]> {
    return Promise.resolve(sdkOk(this.reports.slice(-limit)));
  }
}

export function createInMemoryParitySoakReportSource(): InMemoryParitySoakReportSource {
  return new InMemoryParitySoakReportSource();
}
