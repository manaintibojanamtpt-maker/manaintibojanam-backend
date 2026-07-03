/**
 * Menu operational validator (M7 PR-10).
 * Orchestrates lag, drift, replay, and health analysis — evidence only.
 */

import type {
  MenuOperationalSampleSourcePort,
  MenuOperationalRepositoryPort,
  MenuLagRepositoryPort,
  MenuHealthRepositoryPort,
  MenuOperationalValidationResult,
  MenuOperationalHealthSnapshot,
} from './menuOperationalPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { readMenuFlagDefault, type MenuFeatureFlagReader } from '../featureFlags/featureFlags';
import { menuNotConfiguredAsync } from '../adapters/notConfigured';
import {
  buildMenuOperationalReport,
  type MenuOperationalSample,
} from '../../../domain/menu/operations/MenuOperationalRules';
import type { MenuOperationalThresholds } from '../../../domain/menu/operations/MenuOperationalThresholds';
import { mergeMenuOperationalThresholds } from '../../../domain/menu/operations/MenuOperationalThresholds';
import { createMenuLagAnalyzer, type MenuLagAnalyzer } from './MenuLagAnalyzer';
import {
  createMenuProjectionDriftDetector,
  type MenuProjectionDriftDetector,
} from './MenuProjectionDriftDetector';
import { createMenuReplayValidator, type MenuReplayValidator } from './MenuReplayValidator';
import {
  createMenuProjectionHealthMonitor,
  type MenuProjectionHealthMonitor,
} from './MenuProjectionHealthMonitor';
import type { MenuOperationalTelemetryHook } from './MenuOperationalTelemetry';
import { createMenuOperationalTelemetryEmitter } from './MenuOperationalTelemetry';

export interface MenuOperationalClock {
  now(): string;
}

export interface MenuOperationalUuid {
  generate(): string;
}

export interface MenuOperationalValidatorOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly sampleSource: MenuOperationalSampleSourcePort;
  readonly operationalRepository?: MenuOperationalRepositoryPort;
  readonly lagRepository?: MenuLagRepositoryPort;
  readonly healthRepository?: MenuHealthRepositoryPort;
  readonly lagAnalyzer?: MenuLagAnalyzer;
  readonly driftDetector?: MenuProjectionDriftDetector;
  readonly replayValidator?: MenuReplayValidator;
  readonly healthMonitor?: MenuProjectionHealthMonitor;
  readonly thresholds?: Partial<MenuOperationalThresholds>;
  readonly clock?: MenuOperationalClock;
  readonly uuid?: MenuOperationalUuid;
  readonly onTelemetry?: MenuOperationalTelemetryHook;
}

export class MenuOperationalValidator {
  private readonly thresholds: MenuOperationalThresholds;
  private readonly lagAnalyzer: MenuLagAnalyzer;
  private readonly driftDetector: MenuProjectionDriftDetector;
  private readonly replayValidator: MenuReplayValidator;
  private readonly healthMonitor: MenuProjectionHealthMonitor;

  constructor(private readonly options: MenuOperationalValidatorOptions) {
    this.thresholds = mergeMenuOperationalThresholds(options.thresholds);
    this.lagAnalyzer = options.lagAnalyzer ?? createMenuLagAnalyzer();
    this.driftDetector =
      options.driftDetector ?? createMenuProjectionDriftDetector(this.thresholds);
    this.replayValidator = options.replayValidator ?? createMenuReplayValidator(this.thresholds);
    this.healthMonitor =
      options.healthMonitor ?? createMenuProjectionHealthMonitor(this.thresholds);
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readMenuFlagDefault;
    return (
      readFlag('FF_MENU_PROJECTION_ENABLED') &&
      readFlag('FF_MENU_PROJECTION_PARITY_ENABLED') &&
      readFlag('FF_MENU_PROJECTION_SOAK_ENABLED') &&
      readFlag('FF_MENU_OPERATIONAL_VALIDATION_ENABLED')
    );
  }

  async validate(
    projectionName: string,
    limit = 100
  ): SdkAsyncResult<MenuOperationalValidationResult> {
    if (!this.isEnabled()) {
      return menuNotConfiguredAsync('validate', 'MenuOperationalValidator');
    }

    const telemetry = createMenuOperationalTelemetryEmitter(
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

    const report = buildMenuOperationalReport(
      this.options.uuid?.generate() ?? `menu-op-${Date.now()}`,
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
      const snapshot: MenuOperationalHealthSnapshot = {
        snapshotId: this.options.uuid?.generate() ?? `menu-health-${Date.now()}`,
        projectionName,
        health: report.health,
        readiness: report.readiness,
        capturedAt: latest.evaluatedAt,
      };
      await this.options.healthRepository.save(snapshot);
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

export function createMenuOperationalValidator(
  options: MenuOperationalValidatorOptions
): MenuOperationalValidator {
  return new MenuOperationalValidator(options);
}

export class InMemoryMenuOperationalSampleSource implements MenuOperationalSampleSourcePort {
  private readonly samples: MenuOperationalSample[] = [];

  seed(sample: MenuOperationalSample): void {
    this.samples.push(sample);
  }

  seedMany(samples: readonly MenuOperationalSample[]): void {
    this.samples.push(...samples);
  }

  listSamples(limit: number): SdkAsyncResult<MenuOperationalSample[]> {
    return Promise.resolve(sdkOk(this.samples.slice(-limit)));
  }
}

export class InMemoryMenuOperationalRepository implements MenuOperationalRepositoryPort {
  private readonly reports: import('../../../domain/menu/operations/MenuOperationalRules').MenuOperationalReport[] =
    [];

  save(
    report: import('../../../domain/menu/operations/MenuOperationalRules').MenuOperationalReport
  ): SdkAsyncResult<void> {
    this.reports.push(report);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(projectionName: string) {
    const latest =
      [...this.reports].reverse().find((r) => r.projectionName === projectionName) ?? null;
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

export class InMemoryMenuLagRepository implements MenuLagRepositoryPort {
  private readonly records: import('../../../domain/menu/operations/MenuProjectionLag').MenuProjectionLagMetrics[] =
    [];

  save(
    metrics: import('../../../domain/menu/operations/MenuProjectionLag').MenuProjectionLagMetrics
  ): SdkAsyncResult<void> {
    this.records.push(metrics);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(projectionName: string) {
    const latest =
      [...this.records].reverse().find((r) => r.projectionName === projectionName) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  getMaximumLag(projectionName: string) {
    const max = this.records
      .filter((r) => r.projectionName === projectionName)
      .reduce((highest, record) => Math.max(highest, record.maximumLagMs), 0);
    return Promise.resolve(sdkOk(max));
  }
}

export class InMemoryMenuHealthRepository implements MenuHealthRepositoryPort {
  private readonly snapshots: MenuOperationalHealthSnapshot[] = [];

  save(snapshot: MenuOperationalHealthSnapshot): SdkAsyncResult<void> {
    this.snapshots.push(snapshot);
    return Promise.resolve(sdkOk(undefined));
  }

  getLatest(projectionName: string) {
    const latest =
      [...this.snapshots].reverse().find((s) => s.projectionName === projectionName) ?? null;
    return Promise.resolve(sdkOk(latest));
  }

  list(limit: number) {
    return Promise.resolve(sdkOk(this.snapshots.slice(-limit)));
  }
}

export function createInMemoryMenuOperationalSampleSource(): InMemoryMenuOperationalSampleSource {
  return new InMemoryMenuOperationalSampleSource();
}

export function createInMemoryMenuOperationalRepository(): InMemoryMenuOperationalRepository {
  return new InMemoryMenuOperationalRepository();
}

export function createInMemoryMenuLagRepository(): InMemoryMenuLagRepository {
  return new InMemoryMenuLagRepository();
}

export function createInMemoryMenuHealthRepository(): InMemoryMenuHealthRepository {
  return new InMemoryMenuHealthRepository();
}
