/**
 * Menu domain — pricing models (M7 PR-2).
 */

export interface PriceSnapshot {
  readonly amount: number;
  readonly currency: string;
}

export interface EffectivePrice {
  readonly base: PriceSnapshot;
  readonly final: PriceSnapshot;
  readonly discountApplied: boolean;
}

/** Placeholder — discount policy wiring arrives in future PRs. */
export interface DiscountPolicy {
  readonly policyId: string;
  readonly label: string;
  readonly active: boolean;
}

/** Placeholder — tax reference wiring arrives in future PRs. */
export interface TaxReference {
  readonly taxCode: string;
  readonly ratePercent: number;
  readonly inclusive: boolean;
}
