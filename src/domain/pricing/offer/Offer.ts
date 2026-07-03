/**
 * Domain — Offer types (M8 PR-2).
 * Validation only — no pricing execution.
 */

import type { OfferKind } from '../shared/PricingDomainTypes';

export type OfferPriority = 'low' | 'normal' | 'high';

export interface OfferRule {
  readonly ruleId: string;
  readonly kind: OfferKind;
  readonly value: number;
  readonly buyQuantity?: number;
  readonly getQuantity?: number;
}

export interface Offer {
  readonly offerId: string;
  readonly name: string;
  readonly rule: OfferRule;
  readonly priority: OfferPriority;
  readonly active: boolean;
}
