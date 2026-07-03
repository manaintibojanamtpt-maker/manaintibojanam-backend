/**
 * PricingSDK DTOs — results (M8 PR-1).
 */

import type { Money, MoneyLine } from './money';

export interface PriceResult {
  readonly unitPrice: Money;
  readonly totalPrice: Money;
  readonly priceListVersion?: string;
}

export interface PriceCalculation extends PriceResult {
  readonly basePrice: Money;
  readonly modifierTotal?: Money;
}

export interface CouponApplication {
  readonly couponCode: string;
  readonly discountAmount: Money;
  readonly applied: boolean;
}

export interface TaxLine {
  readonly code: string;
  readonly label: string;
  readonly rate: number;
  readonly amount: Money;
}

export interface TaxBreakdown {
  readonly taxableAmount: Money;
  readonly totalTax: Money;
  readonly lines: TaxLine[];
}

export interface FeeResult {
  readonly fee: Money;
  readonly feeType: 'delivery' | 'packaging' | 'service' | 'convenience';
}

export interface FinalBill {
  readonly subtotal: Money;
  readonly taxes: Money;
  readonly fees: MoneyLine[];
  readonly discounts: MoneyLine[];
  readonly grandTotal: Money;
}

export interface PricingValidationResult {
  readonly valid: boolean;
  readonly issues: ReadonlyArray<{ readonly code: string; readonly message: string }>;
}
