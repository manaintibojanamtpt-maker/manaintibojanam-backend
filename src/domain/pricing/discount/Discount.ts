/**
 * Domain — Discount types (M8 PR-2).
 * Validation only — no execution engine.
 */

import type { DiscountApplicationMode } from '../shared/PricingDomainTypes';

export type DiscountType = 'percentage' | 'fixed';

export interface Discount {
  readonly discountId: string;
  readonly type: DiscountType;
  readonly value: number;
  readonly applicationMode: DiscountApplicationMode;
  readonly active: boolean;
  readonly label?: string;
}

export interface DiscountPolicy {
  readonly policyId: string;
  readonly maxDiscountPercent?: number;
  readonly allowStacking: boolean;
  readonly manualAllowed: boolean;
  readonly automaticAllowed: boolean;
}

export interface DiscountResult {
  readonly discountId: string;
  readonly applied: boolean;
  readonly discountAmount: number;
  readonly reasonCode?: string;
}
