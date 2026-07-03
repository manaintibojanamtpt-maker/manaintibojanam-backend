/**
 * Domain — Delivery charge types (M8 PR-2).
 * Rules only — no map APIs or location SDK.
 */

import type { Money } from '../money/Money';
import type { PricingRegionCode } from '../shared/PricingDomainTypes';

export interface DeliveryZone {
  readonly zoneId: string;
  readonly name: string;
  readonly regionCode: PricingRegionCode;
  readonly active: boolean;
}

export interface DeliveryRule {
  readonly ruleId: string;
  readonly zoneId: string;
  readonly minOrderAmount?: Money;
  readonly flatCharge: Money;
  readonly active: boolean;
}

export interface DeliveryCharge {
  readonly chargeId: string;
  readonly ruleId: string;
  readonly amount: Money;
}
