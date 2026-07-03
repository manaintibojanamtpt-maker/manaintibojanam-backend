/**
 * Pricing parity result types (M8 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { PricingParityDifference } from './PricingParityDifference';

export type PricingParityOutcome =
  | 'MATCH'
  | 'FIELD_MISMATCH'
  | 'MISSING_IN_PROJECTION'
  | 'MISSING_IN_LEGACY'
  | 'VERSION_MISMATCH'
  | 'UNSUPPORTED';

export interface PricingParityResult {
  readonly priceListId: string;
  readonly outcome: PricingParityOutcome;
  readonly differences: readonly PricingParityDifference[];
  readonly comparedAt: string;
  readonly legacyVersion?: string;
  readonly projectionVersion?: string;
}

export interface PricingParityReportRecord extends PricingParityResult {
  readonly reportId: string;
  readonly tenantId?: string;
  readonly durationMs?: number;
}

export function isPricingParityMatch(outcome: PricingParityOutcome): boolean {
  return outcome === 'MATCH';
}
