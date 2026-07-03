/** Order parity difference records (M6 PR-8). Pure domain — no SDK imports. */

import type { OrderParityOutcome } from './OrderParityResult';

export interface OrderParityDifference {
  readonly field: string;
  readonly legacyValue?: unknown;
  readonly projectionValue?: unknown;
  readonly category: OrderParityOutcome;
}

export function createFieldDifference(
  field: string,
  legacyValue: unknown,
  projectionValue: unknown,
  category: OrderParityOutcome = 'FIELD_MISMATCH'
): OrderParityDifference {
  return { field, legacyValue, projectionValue, category };
}
