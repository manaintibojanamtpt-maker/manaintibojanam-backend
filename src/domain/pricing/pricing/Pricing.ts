/**
 * Domain — Pricing types (M8 PR-2).
 */

import type { Money } from '../money/Money';
import type { PricingBranchId, PricingItemId, PricingTenantId } from '../shared/PricingDomainTypes';

export interface BasePrice {
  readonly itemId: PricingItemId;
  readonly amount: Money;
}

export interface EffectivePrice {
  readonly itemId: PricingItemId;
  readonly baseAmount: Money;
  readonly effectiveAmount: Money;
  readonly branchId?: PricingBranchId;
}

export interface PriceSnapshot {
  readonly snapshotId: string;
  readonly itemId: PricingItemId;
  readonly baseAmount: Money;
  readonly effectiveAmount: Money;
  readonly capturedAt: string;
}

export interface PriceListEntry {
  readonly itemId: PricingItemId;
  readonly baseAmount: Money;
}

export interface PriceList {
  readonly priceListId: string;
  readonly tenantId: PricingTenantId;
  readonly name: string;
  readonly prices: readonly PriceListEntry[];
  readonly version: string;
  readonly active: boolean;
}

/** Branch override placeholder — no resolution engine in PR-2. */
export interface BranchPriceOverride {
  readonly branchId: PricingBranchId;
  readonly itemId: PricingItemId;
  readonly overrideAmount: Money;
  readonly active: boolean;
}

export const buildEffectivePrice = (
  base: BasePrice,
  override?: BranchPriceOverride
): EffectivePrice => {
  const effectiveAmount =
    override?.active && override.itemId === base.itemId
      ? override.overrideAmount
      : base.amount;
  return Object.freeze({
    itemId: base.itemId,
    baseAmount: base.amount,
    effectiveAmount,
    branchId: override?.branchId,
  });
};

export const capturePriceSnapshot = (
  effective: EffectivePrice,
  snapshotId: string,
  capturedAt: string
): PriceSnapshot =>
  Object.freeze({
    snapshotId,
    itemId: effective.itemId,
    baseAmount: effective.baseAmount,
    effectiveAmount: effective.effectiveAmount,
    capturedAt,
  });
