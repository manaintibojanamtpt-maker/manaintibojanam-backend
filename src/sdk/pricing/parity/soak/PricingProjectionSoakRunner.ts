/**
 * Pricing projection soak runner (M8 PR-9).
 * Consumes parity reports and produces certification evidence only.
 */

import type {
  PricingParityReportSourcePort,
  PricingProjectionCertificationRepositoryPort,
  PricingProjectionSoakRunResult,
} from './pricingProjectionSoakPorts';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  readPricingFlagDefault,
  type PricingFeatureFlagReader,
} from '../../featureFlags/featureFlags';
import { pricingNotConfiguredAsync } from '../../adapters/notConfigured';
import type { PricingParityReportRecord } from '../../../../domain/pricing/parity/PricingParityResult';
import type { PricingProjectionCertificationReport } from '../../../../domain/pricing/parity/soak/PricingProjectionCertificationRules';
import {
  createPricingProjectionAnalyzer,
  type PricingProjectionAnalyzer,
} from './PricingProjectionAnalyzer';
import { createPricingProjectionMetrics, type PricingProjectionMetrics } from './PricingProjectionMetrics';
import type { PricingProjectionSoakTelemetryHook } from './PricingProjectionTelemetry';
import { createPricingProjectionSoakTelemetryEmitter } from './PricingProjectionTelemetry';

export interface PricingProjectionSoakRunnerOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly reportSource: PricingParityReportSourcePort;
  readonly certificationRepository?: PricingProjectionCertificationRepositoryPort;
  readonly analyzer?: PricingProjectionAnalyzer;
  readonly metrics?: PricingProjectionMetrics;
  readonly onTelemetry?: PricingProjectionSoakTelemetryHook;
  readonly defaultLimit?: number;
}

export class PricingProjectionSoakRunner {
  private readonly analyzer: PricingProjectionAnalyzer;
  private readonly metrics: PricingProjectionMetrics;
  private readonly defaultLimit: number;

  constructor(private readonly options: PricingProjectionSoakRunnerOptions) {
    this.analyzer = options.analyzer ?? createPricingProjectionAnalyzer();
    this.metrics = options.metrics ?? createPricingProjectionMetrics();
    this.defaultLimit = options.defaultLimit ?? 1000;
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readPricingFlagDefault;
    return (
      readFlag('FF_PRICING_PROJECTION_ENABLED') &&
      readFlag('FF_PRICING_PROJECTION_PARITY_ENABLED') &&
      readFlag('FF_PRICING_PROJECTION_SOAK_ENABLED')
    );
  }

  private async loadReports(limit: number): SdkAsyncResult<PricingParityReportRecord[]> {
    return this.options.reportSource.listReports(limit);
  }

  async analyze(limit = this.defaultLimit): SdkAsyncResult<PricingProjectionCertificationReport> {
    if (!this.isEnabled()) {
      return pricingNotConfiguredAsync('analyze', 'PricingProjectionSoakRunner');
    }

    const telemetry = createPricingProjectionSoakTelemetryEmitter(
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
    telemetry.readinessGenerated(
      certification.health.status,
      certification.readiness.certification
    );
    telemetry.certificationGenerated(
      certification.health.status,
      certification.readiness.certification
    );
    telemetry.soakCompleted(loaded.value.length);
    return sdkOk(certification);
  }

  async runSoak(limit = this.defaultLimit): SdkAsyncResult<PricingProjectionSoakRunResult> {
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
    import('../../../../domain/pricing/parity/soak/PricingProjectionCertificationRules').PricingProjectionSoakMetrics
  > {
    if (!this.isEnabled()) {
      return pricingNotConfiguredAsync('metricsOnly', 'PricingProjectionSoakRunner');
    }

    const loaded = await this.loadReports(limit);
    if (!loaded.ok) return loaded;
    return sdkOk(this.metrics.aggregate(loaded.value));
  }
}

export function createPricingProjectionSoakRunner(
  options: PricingProjectionSoakRunnerOptions
): PricingProjectionSoakRunner {
  return new PricingProjectionSoakRunner(options);
}

export class InMemoryPricingParityReportSource implements PricingParityReportSourcePort {
  private readonly reports: PricingParityReportRecord[] = [];

  seed(report: PricingParityReportRecord): void {
    this.reports.push(report);
  }

  seedMany(reports: readonly PricingParityReportRecord[]): void {
    this.reports.push(...reports);
  }

  listReports(limit: number): SdkAsyncResult<PricingParityReportRecord[]> {
    return Promise.resolve(sdkOk(this.reports.slice(-limit)));
  }
}

export function createInMemoryPricingParityReportSource(): InMemoryPricingParityReportSource {
  return new InMemoryPricingParityReportSource();
}
