/**
 * Projection operational validator (M6 PR-10).
 * Orchestrates lag, drift, replay, and health analysis — staging evidence only.
 */

import type {
  ProjectionOperationalSampleSourcePort,
  ProjectionOperationalRepositoryPort,
  ProjectionLagRepositoryPort,
  ProjectionHealthRepositoryPort,
  ProjectionOperationalValidationResult,
} from '../contracts/projectionOperationalPorts';
import type { ClockPort, UuidPort } from '../contracts/ports';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import {
  readEventFlagDefault,
  type EventFeatureFlagReader,
} from '../core/featureFlags';
import { eventNotConfiguredAsync } from '../adapters/notConfigured';
import {
  buildProjectionOperationalReport,
  type ProjectionOperationalSample,
} from '../../../domain/events/operations/ProjectionOperationalRules';
import type { ProjectionOperationalThresholds } from '../../../domain/events/operations/ProjectionOperationalThresholds';
import { mergeProjectionOperationalThresholds } from '../../../domain/events/operations/ProjectionOperationalThresholds';
import { createProjectionLagAnalyzer, type ProjectionLagAnalyzer } from './ProjectionLagAnalyzer';
import { createProjectionDriftDetector, type ProjectionDriftDetector } from './ProjectionDriftDetector';
import { createProjectionReplayValidator, type ProjectionReplayValidator } from './ProjectionReplayValidator';
import { createProjectionHealthMonitor, type ProjectionHealthMonitor } from './ProjectionHealthMonitor';
import type { ProjectionOperationalTelemetryHook } from './ProjectionOperationalTelemetry';
import { createProjectionOperationalTelemetryEmitter } from './ProjectionOperationalTelemetry';

export interface ProjectionOperationalValidatorOptions {
  readonly featureFlags?: EventFeatureFlagReader;
  readonly sampleSource: ProjectionOperationalSampleSourcePort;
  readonly operationalRepository?: ProjectionOperationalRepositoryPort;
  readonly lagRepository?: ProjectionLagRepositoryPort;
  readonly healthRepository?: ProjectionHealthRepositoryPort;
  readonly lagAnalyzer?: ProjectionLagAnalyzer;
  readonly driftDetector?: ProjectionDriftDetector;
  readonly replayValidator?: ProjectionReplayValidator;
  readonly healthMonitor?: ProjectionHealthMonitor;
  readonly thresholds?: Partial<ProjectionOperationalThresholds>;
  readonly clock?: ClockPort;
  readonly uuid?: UuidPort;
  readonly onTelemetry?: ProjectionOperationalTelemetryHook;
}

export class ProjectionOperationalValidator {
  private readonly thresholds: ProjectionOperationalThresholds;
  private readonly lagAnalyzer: ProjectionLagAnalyzer;
  private readonly driftDetector: ProjectionDriftDetector;
  private readonly replayValidator: ProjectionReplayValidator;
  private readonly healthMonitor: ProjectionHealthMonitor;

  constructor(private readonly options: ProjectionOperationalValidatorOptions) {
    this.thresholds = mergeProjectionOperationalThresholds(options.thresholds);
    this.lagAnalyzer = options.lagAnalyzer ?? createProjectionLagAnalyzer();
    this.driftDetector = options.driftDetector ?? createProjectionDriftDetector(this.thresholds);
    this.replayValidator = options.replayValidator ?? createProjectionReplayValidator(this.thresholds);
    this.healthMonitor = options.healthMonitor ?? createProjectionHealthMonitor(this.thresholds);
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readEventFlagDefault;
    return (
      readFlag('FF_EVENT_PLATFORM_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_ENABLED') &&
      readFlag('FF_EVENT_PROJECTION_RUNTIME_ENABLED') &&
      readFlag('FF_ORDER_READ_PROJECTION_ENABLED') &&
      readFlag('FF_ORDER_PROJECTION_PARITY_ENABLED') &&
      readFlag('FF_ORDER_PROJECTION_SOAK_ENABLED') &&
      readFlag('FF_EVENT_OPERATIONAL_VALIDATION_ENABLED')
    );
  }

  async validate(
    projectionName: string,
    limit = 100
  ): SdkAsyncResult<ProjectionOperationalValidationResult> {
    if (!this.isEnabled()) {
      return eventNotConfiguredAsync('validate', 'ProjectionOperationalValidator');
    }

    const telemetry = createProjectionOperationalTelemetryEmitter(
      this.options.onTelemetry,
      'validate',
      projectionName
    );
    telemetry.operationalStarted();

    const loaded = await this.options.sampleSource.listSamples(limit);
    if (!loaded.ok) {
      telemetry.operationalFailed(loaded.error.code);
      return loaded;
    }

    const samples = loaded.value.filter((sample) => sample.projectionName === projectionName);
    if (samples.length === 0) {
      telemetry.operationalFailed('NO_SAMPLES');
      return {
        ok: false,
        error: { code: 'NOT_FOUND', message: `No operational samples for ${projectionName}` },
      };
    }

    const latest = samples[samples.length - 1]!;
    const historicalMaxLag = await this.resolveHistoricalMaxLag(projectionName);
    const lag = this.lagAnalyzer.analyze(latest, historicalMaxLag);
    if (lag.currentLagMs > this.thresholds.maxLagMs) {
      telemetry.lagDetected(lag.currentLagMs);
    }

    const drift = this.driftDetector.detect(latest);
    if (drift.driftDetected) {
      telemetry.driftDetected();
    }

    const replay = this.replayValidator.validate(latest);
    if (replay.verified) {
      telemetry.replayVerified();
    }

    const report = buildProjectionOperationalReport(
      this.options.uuid?.generate() ?? `op-${Date.now()}`,
      latest,
      samples.length,
      this.thresholds
    );

    telemetry.healthUpdated(report.health.status, report.readiness);
    telemetry.operationalCompleted(report.health.status, report.readiness);

    if (this.options.lagRepository) {
      await this.options.lagRepository.save(lag);
    }
    if (this.options.operationalRepository) {
      await this.options.operationalRepository.save(report);
    }
    if (this.options.healthRepository) {
      await this.options.healthRepository.save({
        snapshotId: this.options.uuid?.generate() ?? `health-${Date.now()}`,
        projectionName,
        health: report.health,
        readiness: report.readiness,
        capturedAt: latest.evaluatedAt,
      });
    }

    return sdkOk({
      report,
      lag,
      driftDetected: drift.driftDetected,
      replayVerified: replay.verified,
    });
  }

  private async resolveHistoricalMaxLag(projectionName: string): Promise<number> {
    if (!this.options.lagRepository) return 0;
    const result = await this.options.lagRepository.getMaximumLag(projectionName);
    return result.ok ? result.value : 0;
  }
}

export function createProjectionOperationalValidator(
  options: ProjectionOperationalValidatorOptions
): ProjectionOperationalValidator {
  return new ProjectionOperationalValidator(options);
}

export class InMemoryProjectionOperationalSampleSource implements ProjectionOperationalSampleSourcePort {
  private readonly samples: ProjectionOperationalSample[] = [];

  seed(sample: ProjectionOperationalSample): void {
    this.samples.push(sample);
  }

  seedMany(samples: readonly ProjectionOperationalSample[]): void {
    this.samples.push(...samples);
  }

  listSamples(limit: number): SdkAsyncResult<ProjectionOperationalSample[]> {
    return Promise.resolve(sdkOk(this.samples.slice(-limit)));
  }
}

export class InMemoryProjectionOperationalRepository implements ProjectionOperationalRepositoryPort {
  private readonly reports: import('../../../domain/events/operations/ProjectionOperationalRules').ProjectionOperationalReport[] = [];

  save(report: import('../../../domain/events/operations/ProjectionOperationalRules').ProjectionOperationalReport): SdkAsyncResult<void> {
    this.reports.push(report);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(projectionName: string) {
    const latest = [...this.reports].reverse().find((r) => r.projectionName === projectionName) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  list(projectionName: string, limit: number) {
    const items = this.reports.filter((r) => r.projectionName === projectionName).slice(-limit);
    return Promise.resolve(sdkOk(items));
  }

  count() {
    return Promise.resolve(sdkOk(this.reports.length));
  }
}

export class InMemoryProjectionLagRepository implements ProjectionLagRepositoryPort {
  private readonly records: import('../../../domain/events/operations/ProjectionLag').ProjectionLagMetrics[] = [];

  save(metrics: import('../../../domain/events/operations/ProjectionLag').ProjectionLagMetrics): SdkAsyncResult<void> {
    this.records.push(metrics);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(projectionName: string) {
    const latest = [...this.records].reverse().find((r) => r.projectionName === projectionName) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  getMaximumLag(projectionName: string) {
    const max = this.records
      .filter((r) => r.projectionName === projectionName)
      .reduce((highest, record) => Math.max(highest, record.maximumLagMs), 0);
    return Promise.resolve(sdkOk(max));
  }
}

export class InMemoryProjectionHealthRepository implements ProjectionHealthRepositoryPort {
  private readonly snapshots: import('../contracts/projectionOperationalPorts').ProjectionOperationalHealthSnapshot[] = [];

  save(snapshot: import('../contracts/projectionOperationalPorts').ProjectionOperationalHealthSnapshot): SdkAsyncResult<void> {
    this.snapshots.push(snapshot);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(projectionName: string) {
    const latest = [...this.snapshots].reverse().find((s) => s.projectionName === projectionName) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  list(limit: number) {
    return Promise.resolve(sdkOk(this.snapshots.slice(-limit)));
  }
}

export function createInMemoryProjectionOperationalSampleSource(): InMemoryProjectionOperationalSampleSource {
  return new InMemoryProjectionOperationalSampleSource();
}

export function createInMemoryProjectionOperationalRepository(): InMemoryProjectionOperationalRepository {
  return new InMemoryProjectionOperationalRepository();
}

export function createInMemoryProjectionLagRepository(): InMemoryProjectionLagRepository {
  return new InMemoryProjectionLagRepository();
}

export function createInMemoryProjectionHealthRepository(): InMemoryProjectionHealthRepository {
  return new InMemoryProjectionHealthRepository();
}
