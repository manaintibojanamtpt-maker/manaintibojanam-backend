/**
 * Pricing parity difference records (M8 PR-8).
 * Pure domain — no infrastructure imports.
 */

import type { PricingParityOutcome } from './PricingParityResult';

export interface PricingParityDifference {
  readonly field: string;
  readonly legacyValue?: unknown;
  readonly projectionValue?: unknown;
  readonly category: PricingParityOutcome;
}

export function createPricingFieldDifference(
  field: string,
  legacyValue: unknown,
  projectionValue: unknown,
  category: PricingParityOutcome = 'FIELD_MISMATCH'
): PricingParityDifference {
  return { field, legacyValue, projectionValue, category };
}
