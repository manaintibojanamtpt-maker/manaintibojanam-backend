/**
 * Pricing domain — shared types (M8 PR-2).
 */

export type PricingTenantId = string;
export type PricingBranchId = string;
export type PricingItemId = string;
export type PricingRegionCode = string;

export type DiscountApplicationMode = 'manual' | 'automatic';
export type OfferKind = 'percentage' | 'fixed' | 'buy_x_get_y';

export interface PricingTimeWindow {
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface PricingUsageLimit {
  readonly maxUses: number;
  readonly usedCount: number;
}
