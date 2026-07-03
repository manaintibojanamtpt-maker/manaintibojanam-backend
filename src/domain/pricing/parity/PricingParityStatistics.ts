/**
 * Pricing parity statistics (M8 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { PricingParityOutcome } from './PricingParityResult';

export interface PricingParityStatistics {
  readonly totalCompared: number;
  readonly matched: number;
  readonly mismatched: number;
  readonly missingInProjection: number;
  readonly missingInLegacy: number;
  readonly versionMismatches: number;
  readonly fieldMismatches: number;
  readonly unsupported: number;
  readonly totalDurationMs: number;
}

export interface PricingParityStatisticsSummary extends PricingParityStatistics {
  readonly matchPercent: number;
  readonly fieldParityPercent: number;
  readonly missingPercent: number;
  readonly averageComparisonDurationMs: number;
}

export const EMPTY_PRICING_PARITY_STATISTICS: PricingParityStatistics = {
  totalCompared: 0,
  matched: 0,
  mismatched: 0,
  missingInProjection: 0,
  missingInLegacy: 0,
  versionMismatches: 0,
  fieldMismatches: 0,
  unsupported: 0,
  totalDurationMs: 0,
};

export function accumulatePricingParityStatistics(
  current: PricingParityStatistics,
  outcome: PricingParityOutcome,
  durationMs = 0
): PricingParityStatistics {
  const base: PricingParityStatistics = {
    ...current,
    totalCompared: current.totalCompared + 1,
    totalDurationMs: current.totalDurationMs + Math.max(0, durationMs),
  };

  switch (outcome) {
    case 'MATCH':
      return { ...base, matched: current.matched + 1 };
    case 'MISSING_IN_PROJECTION':
      return {
        ...base,
        mismatched: current.mismatched + 1,
        missingInProjection: current.missingInProjection + 1,
      };
    case 'MISSING_IN_LEGACY':
      return {
        ...base,
        mismatched: current.mismatched + 1,
        missingInLegacy: current.missingInLegacy + 1,
      };
    case 'VERSION_MISMATCH':
      return {
        ...base,
        mismatched: current.mismatched + 1,
        versionMismatches: current.versionMismatches + 1,
      };
    case 'FIELD_MISMATCH':
      return {
        ...base,
        mismatched: current.mismatched + 1,
        fieldMismatches: current.fieldMismatches + 1,
      };
    case 'UNSUPPORTED':
      return {
        ...base,
        mismatched: current.mismatched + 1,
        unsupported: current.unsupported + 1,
      };
    default:
      return base;
  }
}

const percent = (numerator: number, denominator: number): number => {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
};

export function summarizePricingParityStatistics(
  statistics: PricingParityStatistics
): PricingParityStatisticsSummary {
  const total = statistics.totalCompared;
  const fieldParityMatches = statistics.matched;
  const missingTotal = statistics.missingInProjection + statistics.missingInLegacy;

  return {
    ...statistics,
    matchPercent: percent(statistics.matched, total),
    fieldParityPercent: percent(fieldParityMatches, total),
    missingPercent: percent(missingTotal, total),
    averageComparisonDurationMs:
      total > 0 ? Math.round(statistics.totalDurationMs / total) : 0,
  };
}
