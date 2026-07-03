/**
 * Menu parity difference records (M7 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { MenuParityOutcome } from './MenuParityResult';

export interface MenuParityDifference {
  readonly field: string;
  readonly legacyValue?: unknown;
  readonly projectionValue?: unknown;
  readonly category: MenuParityOutcome;
}

export function createMenuFieldDifference(
  field: string,
  legacyValue: unknown,
  projectionValue: unknown,
  category: MenuParityOutcome = 'FIELD_MISMATCH'
): MenuParityDifference {
  return { field, legacyValue, projectionValue, category };
}
