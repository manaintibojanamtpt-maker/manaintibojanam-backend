/**
 * Menu projection soak runner (M7 PR-9).
 * Consumes parity reports and produces certification evidence only.
 */

import type {
  MenuParityReportSourcePort,
  MenuProjectionCertificationRepositoryPort,
  MenuProjectionSoakRunResult,
} from './menuProjectionSoakPorts';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import {
  readMenuFlagDefault,
  type MenuFeatureFlagReader,
} from '../../featureFlags/featureFlags';
import { menuNotConfiguredAsync } from '../../adapters/notConfigured';
import type { MenuParityReportRecord } from '../../../../domain/menu/parity/MenuParityResult';
import type { MenuProjectionCertificationReport } from '../../../../domain/menu/parity/soak/MenuProjectionCertificationRules';
import { createMenuProjectionAnalyzer, type MenuProjectionAnalyzer } from './MenuProjectionAnalyzer';
import { createMenuProjectionMetrics, type MenuProjectionMetrics } from './MenuProjectionMetrics';
import type { MenuProjectionSoakTelemetryHook } from './MenuProjectionTelemetry';
import { createMenuProjectionSoakTelemetryEmitter } from './MenuProjectionTelemetry';

export interface MenuProjectionSoakRunnerOptions {
  readonly featureFlags?: MenuFeatureFlagReader;
  readonly reportSource: MenuParityReportSourcePort;
  readonly certificationRepository?: MenuProjectionCertificationRepositoryPort;
  readonly analyzer?: MenuProjectionAnalyzer;
  readonly metrics?: MenuProjectionMetrics;
  readonly onTelemetry?: MenuProjectionSoakTelemetryHook;
  readonly defaultLimit?: number;
}

export class MenuProjectionSoakRunner {
  private readonly analyzer: MenuProjectionAnalyzer;
  private readonly metrics: MenuProjectionMetrics;
  private readonly defaultLimit: number;

  constructor(private readonly options: MenuProjectionSoakRunnerOptions) {
    this.analyzer = options.analyzer ?? createMenuProjectionAnalyzer();
    this.metrics = options.metrics ?? createMenuProjectionMetrics();
    this.defaultLimit = options.defaultLimit ?? 1000;
  }

  private isEnabled(): boolean {
    const readFlag = this.options.featureFlags ?? readMenuFlagDefault;
    return (
      readFlag('FF_MENU_PROJECTION_ENABLED') &&
      readFlag('FF_MENU_PROJECTION_PARITY_ENABLED') &&
      readFlag('FF_MENU_PROJECTION_SOAK_ENABLED')
    );
  }

  private async loadReports(limit: number): SdkAsyncResult<MenuParityReportRecord[]> {
    return this.options.reportSource.listReports(limit);
  }

  async analyze(limit = this.defaultLimit): SdkAsyncResult<MenuProjectionCertificationReport> {
    if (!this.isEnabled()) {
      return menuNotConfiguredAsync('analyze', 'MenuProjectionSoakRunner');
    }

    const telemetry = createMenuProjectionSoakTelemetryEmitter(
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

  async runSoak(limit = this.defaultLimit): SdkAsyncResult<MenuProjectionSoakRunResult> {
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
    import('../../../../domain/menu/parity/soak/MenuProjectionCertificationRules').MenuProjectionSoakMetrics
  > {
    if (!this.isEnabled()) {
      return menuNotConfiguredAsync('metricsOnly', 'MenuProjectionSoakRunner');
    }

    const loaded = await this.loadReports(limit);
    if (!loaded.ok) return loaded;
    return sdkOk(this.metrics.aggregate(loaded.value));
  }
}

export function createMenuProjectionSoakRunner(
  options: MenuProjectionSoakRunnerOptions
): MenuProjectionSoakRunner {
  return new MenuProjectionSoakRunner(options);
}

export class InMemoryMenuParityReportSource implements MenuParityReportSourcePort {
  private readonly reports: MenuParityReportRecord[] = [];

  seed(report: MenuParityReportRecord): void {
    this.reports.push(report);
  }

  seedMany(reports: readonly MenuParityReportRecord[]): void {
    this.reports.push(...reports);
  }

  listReports(limit: number): SdkAsyncResult<MenuParityReportRecord[]> {
    return Promise.resolve(sdkOk(this.reports.slice(-limit)));
  }
}

export function createInMemoryMenuParityReportSource(): InMemoryMenuParityReportSource {
  return new InMemoryMenuParityReportSource();
}
