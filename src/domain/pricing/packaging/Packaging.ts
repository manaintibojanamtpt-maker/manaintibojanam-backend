/**
 * Domain — Packaging charge types (M8 PR-2).
 * Validation only.
 */

import type { Money } from '../money/Money';

export interface PackagingRule {
  readonly ruleId: string;
  readonly label: string;
  readonly flatCharge: Money;
  readonly perItemCharge?: Money;
  readonly active: boolean;
}

export interface PackagingCharge {
  readonly chargeId: string;
  readonly ruleId: string;
  readonly amount: Money;
}
