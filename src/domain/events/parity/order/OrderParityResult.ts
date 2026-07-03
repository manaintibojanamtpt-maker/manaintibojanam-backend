/** Order parity result types (M6 PR-8). Pure domain — no SDK imports. */

import type { OrderParityDifference } from './OrderParityDifference';

export type OrderParityOutcome =
  | 'MATCH'
  | 'MISSING_IN_PROJECTION'
  | 'MISSING_IN_LEGACY'
  | 'FIELD_MISMATCH'
  | 'VERSION_MISMATCH'
  | 'UNSUPPORTED_EVENT';

export interface OrderParityResult {
  readonly orderId: string;
  readonly outcome: OrderParityOutcome;
  readonly differences: readonly OrderParityDifference[];
  readonly comparedAt: string;
  readonly legacyVersion?: string;
  readonly projectionVersion?: string;
}

export interface OrderParityReportRecord extends OrderParityResult {
  readonly reportId: string;
  readonly tenantId?: string;
  readonly durationMs?: number;
}

export function isParityMatch(outcome: OrderParityOutcome): boolean {
  return outcome === 'MATCH';
}
