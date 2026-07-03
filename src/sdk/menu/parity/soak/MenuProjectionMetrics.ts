/**
 * Menu projection soak metrics aggregator (M7 PR-9).
 */

import type { MenuParityReportRecord } from '../../../../domain/menu/parity/MenuParityResult';
import {
  buildMenuProjectionSoakMetrics,
  computeMenuPercentileLatencies,
  isCriticalMenuOutcome,
  type MenuProjectionSoakInput,
  type MenuProjectionSoakMetrics,
} from '../../../../domain/menu/parity/soak/MenuProjectionCertificationRules';

export class MenuProjectionMetrics {
  aggregate(reports: readonly MenuParityReportRecord[]): MenuProjectionSoakMetrics {
    return buildMenuProjectionSoakMetrics(this.buildInput(reports));
  }

  buildInput(reports: readonly MenuParityReportRecord[]): MenuProjectionSoakInput {
    const totalComparisons = reports.length;
    const successfulComparisons = reports.filter((report) => report.outcome === 'MATCH').length;
    const fieldMismatches = reports.filter((report) => report.outcome === 'FIELD_MISMATCH').length;
    const missingInProjection = reports.filter(
      (report) => report.outcome === 'MISSING_IN_PROJECTION'
    ).length;
    const missingInLegacy = reports.filter(
      (report) => report.outcome === 'MISSING_IN_LEGACY'
    ).length;
    const versionMismatches = reports.filter(
      (report) => report.outcome === 'VERSION_MISMATCH'
    ).length;
    const unsupported = reports.filter((report) => report.outcome === 'UNSUPPORTED').length;
    const criticalMismatchCount = reports.filter((report) =>
      isCriticalMenuOutcome(report.outcome)
    ).length;

    const latencies = reports
      .map((report) => report.durationMs)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageLatencyMs =
      latencies.length === 0
        ? 0
        : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);
    const p95LatencyMs = computeMenuPercentileLatencies(latencies, 95);

    const mismatchDistribution: Record<string, number> = {};
    for (const report of reports) {
      for (const difference of report.differences) {
        mismatchDistribution[difference.field] =
          (mismatchDistribution[difference.field] ?? 0) + 1;
      }
    }

    const windowSize = Math.max(1, Math.floor(totalComparisons / 5));
    const windowParityPercents: number[] = [];
    for (let index = 0; index < totalComparisons; index += windowSize) {
      const window = reports.slice(index, index + windowSize);
      const matches = window.filter((report) => report.outcome === 'MATCH').length;
      windowParityPercents.push(window.length === 0 ? 0 : (matches / window.length) * 100);
    }

    return {
      totalComparisons,
      successfulComparisons,
      fieldMismatches,
      missingInProjection,
      missingInLegacy,
      versionMismatches,
      unsupported,
      averageLatencyMs,
      p95LatencyMs,
      mismatchDistribution,
      windowParityPercents,
      criticalMismatchCount,
    };
  }
}

export function createMenuProjectionMetrics(): MenuProjectionMetrics {
  return new MenuProjectionMetrics();
}
