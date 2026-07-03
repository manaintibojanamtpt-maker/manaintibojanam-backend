/**
 * Projection parity metrics aggregator (M6 PR-9).
 */

import type { OrderParityReportRecord } from '../../../../domain/events/parity/order/OrderParityResult';
import {
  buildParitySoakMetrics,
  computePercentileLatencies,
  type ParitySoakInput,
  type ParitySoakMetrics,
} from '../../../../domain/events/parity/soak/ParityCertificationRules';

export class ProjectionParityMetrics {
  aggregate(reports: readonly OrderParityReportRecord[]): ParitySoakMetrics {
    const input = this.buildInput(reports);
    return buildParitySoakMetrics(input);
  }

  buildInput(reports: readonly OrderParityReportRecord[]): ParitySoakInput {
    const totalComparisons = reports.length;
    const successfulComparisons = reports.filter((r) => r.outcome === 'MATCH').length;
    const fieldMismatches = reports.filter((r) => r.outcome === 'FIELD_MISMATCH').length;
    const missingProjections = reports.filter((r) => r.outcome === 'MISSING_IN_PROJECTION').length;
    const missingLegacy = reports.filter((r) => r.outcome === 'MISSING_IN_LEGACY').length;
    const versionMismatches = reports.filter((r) => r.outcome === 'VERSION_MISMATCH').length;
    const unsupportedEvents = reports.filter((r) => r.outcome === 'UNSUPPORTED_EVENT').length;

    const latencies = reports
      .map((r) => r.durationMs)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageLatencyMs =
      latencies.length === 0
        ? 0
        : Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length);
    const p95LatencyMs = computePercentileLatencies(latencies, 95);

    const mismatchDistribution: Record<string, number> = {};
    for (const report of reports) {
      for (const difference of report.differences) {
        mismatchDistribution[difference.field] = (mismatchDistribution[difference.field] ?? 0) + 1;
      }
    }

    const windowSize = Math.max(1, Math.floor(totalComparisons / 5));
    const windowParityPercents: number[] = [];
    for (let i = 0; i < totalComparisons; i += windowSize) {
      const window = reports.slice(i, i + windowSize);
      const matches = window.filter((r) => r.outcome === 'MATCH').length;
      windowParityPercents.push(window.length === 0 ? 0 : (matches / window.length) * 100);
    }

    return {
      totalComparisons,
      successfulComparisons,
      fieldMismatches,
      missingProjections,
      missingLegacy,
      versionMismatches,
      unsupportedEvents,
      averageLatencyMs,
      p95LatencyMs,
      mismatchDistribution,
      windowParityPercents,
    };
  }
}

export function createProjectionParityMetrics(): ProjectionParityMetrics {
  return new ProjectionParityMetrics();
}
