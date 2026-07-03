/**
 * PricingSDK DTOs — queries (M8 PR-1).
 */

import type { TenantId, BranchId, MenuItemId, CouponCode, PriceListId } from '../types/branded';
import type { Money } from './money';

export interface PricingContext {
  readonly tenantId: TenantId;
  readonly branchId?: BranchId;
  readonly regionCode?: string;
  readonly priceListId?: PriceListId;
}

export interface GetPriceQuery extends PricingContext {
  readonly itemId: MenuItemId;
  readonly quantity?: number;
}

export interface CalculatePriceQuery extends PricingContext {
  readonly itemId: MenuItemId;
  readonly quantity: number;
  readonly modifierAmount?: Money;
}

export interface ApplyCouponQuery extends PricingContext {
  readonly couponCode: CouponCode;
  readonly subtotal: Money;
}

export interface CalculateTaxesQuery extends PricingContext {
  readonly taxableAmount: Money;
  readonly gstInclusive?: boolean;
}

export interface CalculateDeliveryFeeQuery extends PricingContext {
  readonly orderSubtotal: Money;
  readonly distanceKm?: number;
}

export interface CalculatePackagingFeeQuery extends PricingContext {
  readonly orderSubtotal: Money;
  readonly itemCount: number;
}

export interface CalculateFinalBillQuery extends PricingContext {
  readonly subtotal: Money;
  readonly taxes?: Money;
  readonly deliveryFee?: Money;
  readonly packagingFee?: Money;
  readonly serviceCharge?: Money;
  readonly convenienceFee?: Money;
  readonly discount?: Money;
}

export interface ValidatePricingInput extends PricingContext {
  readonly lines: ReadonlyArray<{
    readonly itemId: MenuItemId;
    readonly quantity: number;
    readonly unitPrice: Money;
  }>;
}
