/**
 * Menu parity result types (M7 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { MenuParityDifference } from './MenuParityDifference';

export type MenuParityOutcome =
  | 'MATCH'
  | 'FIELD_MISMATCH'
  | 'MISSING_IN_PROJECTION'
  | 'MISSING_IN_LEGACY'
  | 'VERSION_MISMATCH'
  | 'UNSUPPORTED';

export interface MenuParityResult {
  readonly catalogId: string;
  readonly outcome: MenuParityOutcome;
  readonly differences: readonly MenuParityDifference[];
  readonly comparedAt: string;
  readonly legacyVersion?: string;
  readonly projectionVersion?: string;
}

export interface MenuParityReportRecord extends MenuParityResult {
  readonly reportId: string;
  readonly tenantId?: string;
  readonly durationMs?: number;
}

export function isMenuParityMatch(outcome: MenuParityOutcome): boolean {
  return outcome === 'MATCH';
}
