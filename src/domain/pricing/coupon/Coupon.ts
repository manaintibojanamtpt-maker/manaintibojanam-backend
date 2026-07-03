/**
 * Domain — Coupon types (M8 PR-2).
 * Validation only — no redemption logic.
 */

import type { Discount } from '../discount/Discount';
import type { PricingTenantId, PricingUsageLimit } from '../shared/PricingDomainTypes';

export interface CouponEligibility {
  readonly tenantId: PricingTenantId;
  readonly minOrderAmount?: number;
  readonly allowedItemIds?: readonly string[];
}

export interface Coupon {
  readonly couponCode: string;
  readonly discount: Discount;
  readonly eligibility: CouponEligibility;
  readonly usageLimit?: PricingUsageLimit;
  readonly expiresAt?: string;
  readonly enabled: boolean;
  readonly active: boolean;
}

export interface CouponResult {
  readonly couponCode: string;
  readonly eligible: boolean;
  readonly reasonCode?: string;
}
