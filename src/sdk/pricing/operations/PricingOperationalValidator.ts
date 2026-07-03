/**
 * Pricing operational validator (M8 PR-10).
 * Orchestrates lag, drift, replay, and health analysis — evidence only.
 */

import type {
  PricingOperationalSampleSourcePort,
  PricingOperationalRepositoryPort,
  PricingLagRepositoryPort,
  PricingHealthRepositoryPort,
  PricingOperationalValidationResult,
  PricingOperationalHealthSnapshot,
} from './pricingOperationalPorts';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { readPricingFlagDefault, type PricingFeatureFlagReader } from '../featureFlags/featureFlags';
import { pricingNotConfiguredAsync } from '../adapters/notConfigured';
import {
  buildPricingOperationalReport,
  type PricingOperationalSample,
} from '../../../domain/pricing/operations/PricingOperationalRules';
import type { PricingOperationalThresholds } from '../../../domain/pricing/operations/PricingOperationalThresholds';
import { mergePricingOperationalThresholds } from '../../../domain/pricing/operations/PricingOperationalThresholds';
import { createPricingLagAnalyzer, type PricingLagAnalyzer } from './PricingLagAnalyzer';
import {
  createPricingProjectionDriftDetector,
  type PricingProjectionDriftDetector,
} from './PricingProjectionDriftDetector';
import { createPricingReplayValidator, type PricingReplayValidator } from './PricingReplayValidator';
import {
  createPricingProjectionHealthMonitor,
  type PricingProjectionHealthMonitor,
} from './PricingProjectionHealthMonitor';
import type { PricingOperationalTelemetryHook } from './PricingOperationalTelemetry';
import { createPricingOperationalTelemetryEmitter } from './PricingOperationalTelemetry';

export interface PricingOperationalClock {
  now(): string;
}

export interface PricingOperationalUuid {
  generate(): string;
}

export interface PricingOperationalValidatorOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly sampleSource: PricingOperationalSampleSourcePort;
  readonly operationalRepository?: PricingOperationalRepositoryPort;
  readonly lagRepository?: PricingLagRepositoryPort;
  readonly healthRepository?: PricingHealthRepositoryPort;
  readonly lagAnalyzer?: PricingLagAnalyzer;
  readonly driftDetector?: PricingProjectionDriftDetector;
  readonly replayValidator?: PricingReplayValidator;
  readonly healthMonitor?: PricingProjectionHealthMonitor;
  readonly thresholds?: Partial<PricingOperationalThresholds>;
  readonly clock?: PricingOperationalClock;
  readonly uuid?: PricingOperationalUuid;
  readonly onTelemetry?: PricingOperationalTelemetryHook;
}

export class PricingOperationalValidator {
  private readonly thresholds: PricingOperationalThresholds;
  private readonly lagAnalyzer: PricingLagAnalyzer;
  private readonly driftDetector: PricingProjectionDriftDetector;
  private readonly replayValidator: PricingReplayValidator;
  private readonly healthMonitor: PricingProjectionHealthMonitor;

  constructor(private readonly options: PricingOperationalValidatorOptions) {
    this.thresholds = mergePricingOperationalThresholds(options.thresholds);
    this.lagAnalyzer = options.lagAnalyzer ?? createPricingLagAnalyzer();
    this.driftDetector =
      options.driftDetector ?? createPricingProjectionDriftDetector(this.thresholds);
    this.replayValidator = options.replayValidator ?? createPricingReplayValidator(this.thresholds);
    this.healthMonitor =
      options.healthMonitor ?? createPricingProjectionHealthMonitor(this.thresholds);
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readPricingFlagDefault;
    return (
      readFlag('FF_PRICING_PROJECTION_ENABLED') &&
      readFlag('FF_PRICING_PROJECTION_PARITY_ENABLED') &&
      readFlag('FF_PRICING_PROJECTION_SOAK_ENABLED') &&
      readFlag('FF_PRICING_OPERATIONAL_VALIDATION_ENABLED')
    );
  }

  async validate(
    projectionName: string,
    limit = 100
  ): SdkAsyncResult<PricingOperationalValidationResult> {
    if (!this.isEnabled()) {
      return pricingNotConfiguredAsync('validate', 'PricingOperationalValidator');
    }

    const telemetry = createPricingOperationalTelemetryEmitter(
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

    const report = buildPricingOperationalReport(
      this.options.uuid?.generate() ?? `pricing-op-${Date.now()}`,
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
      const snapshot: PricingOperationalHealthSnapshot = {
        snapshotId: this.options.uuid?.generate() ?? `pricing-health-${Date.now()}`,
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

export function createPricingOperationalValidator(
  options: PricingOperationalValidatorOptions
): PricingOperationalValidator {
  return new PricingOperationalValidator(options);
}

export class InMemoryPricingOperationalSampleSource implements PricingOperationalSampleSourcePort {
  private readonly samples: PricingOperationalSample[] = [];

  seed(sample: PricingOperationalSample): void {
    this.samples.push(sample);
  }

  seedMany(samples: readonly PricingOperationalSample[]): void {
    this.samples.push(...samples);
  }

  listSamples(limit: number): SdkAsyncResult<PricingOperationalSample[]> {
    return Promise.resolve(sdkOk(this.samples.slice(-limit)));
  }
}

export class InMemoryPricingOperationalRepository implements PricingOperationalRepositoryPort {
  private readonly reports: import('../../../domain/pricing/operations/PricingOperationalRules').PricingOperationalReport[] =
    [];

  save(
    report: import('../../../domain/pricing/operations/PricingOperationalRules').PricingOperationalReport
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

export class InMemoryPricingLagRepository implements PricingLagRepositoryPort {
  private readonly records: import('../../../domain/pricing/operations/PricingProjectionLag').PricingProjectionLagMetrics[] =
    [];

  save(
    metrics: import('../../../domain/pricing/operations/PricingProjectionLag').PricingProjectionLagMetrics
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

export class InMemoryPricingHealthRepository implements PricingHealthRepositoryPort {
  private readonly snapshots: PricingOperationalHealthSnapshot[] = [];

  save(snapshot: PricingOperationalHealthSnapshot): SdkAsyncResult<void> {
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

export function createInMemoryPricingOperationalSampleSource(): InMemoryPricingOperationalSampleSource {
  return new InMemoryPricingOperationalSampleSource();
}

export function createInMemoryPricingOperationalRepository(): InMemoryPricingOperationalRepository {
  return new InMemoryPricingOperationalRepository();
}

export function createInMemoryPricingLagRepository(): InMemoryPricingLagRepository {
  return new InMemoryPricingLagRepository();
}

export function createInMemoryPricingHealthRepository(): InMemoryPricingHealthRepository {
  return new InMemoryPricingHealthRepository();
}
