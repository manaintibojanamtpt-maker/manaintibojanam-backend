/** Order parity statistics (M6 PR-8). Pure domain — no SDK imports. */

import type { OrderParityOutcome } from './OrderParityResult';

export interface OrderParityStatistics {
  readonly totalCompared: number;
  readonly matched: number;
  readonly mismatched: number;
  readonly missingInProjection: number;
  readonly missingInLegacy: number;
  readonly versionMismatches: number;
  readonly fieldMismatches: number;
  readonly unsupportedEvents: number;
}

export const EMPTY_ORDER_PARITY_STATISTICS: OrderParityStatistics = {
  totalCompared: 0,
  matched: 0,
  mismatched: 0,
  missingInProjection: 0,
  missingInLegacy: 0,
  versionMismatches: 0,
  fieldMismatches: 0,
  unsupportedEvents: 0,
};

export function accumulateParityStatistics(
  current: OrderParityStatistics,
  outcome: OrderParityOutcome
): OrderParityStatistics {
  const base = {
    ...current,
    totalCompared: current.totalCompared + 1,
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
    case 'UNSUPPORTED_EVENT':
      return {
        ...base,
        mismatched: current.mismatched + 1,
        unsupportedEvents: current.unsupportedEvents + 1,
      };
    default:
      return base;
  }
}

export function mergeParityStatistics(
  left: OrderParityStatistics,
  right: OrderParityStatistics
): OrderParityStatistics {
  return {
    totalCompared: left.totalCompared + right.totalCompared,
    matched: left.matched + right.matched,
    mismatched: left.mismatched + right.mismatched,
    missingInProjection: left.missingInProjection + right.missingInProjection,
    missingInLegacy: left.missingInLegacy + right.missingInLegacy,
    versionMismatches: left.versionMismatches + right.versionMismatches,
    fieldMismatches: left.fieldMismatches + right.fieldMismatches,
    unsupportedEvents: left.unsupportedEvents + right.unsupportedEvents,
  };
}
