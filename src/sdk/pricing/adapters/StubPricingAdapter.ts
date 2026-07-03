/**
 * PricingSDK — stub adapter (M8 PR-1).
 * All methods return NOT_CONFIGURED until pricing PRs land.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { PricingSDK } from '../contracts/PricingSDK';
import type {
  ApplyCouponQuery,
  CalculateDeliveryFeeQuery,
  CalculateFinalBillQuery,
  CalculatePackagingFeeQuery,
  CalculatePriceQuery,
  CalculateTaxesQuery,
  CouponApplication,
  FeeResult,
  FinalBill,
  GetPriceQuery,
  PriceCalculation,
  PriceResult,
  PricingValidationResult,
  TaxBreakdown,
  ValidatePricingInput,
} from '../dto';
import { pricingNotConfiguredAsync, pricingNotConfiguredSync } from './notConfigured';

const LAYER = 'StubPricingAdapter';

export class StubPricingAdapter implements PricingSDK {
  getPrice(_query: GetPriceQuery): SdkAsyncResult<PriceResult> {
    return pricingNotConfiguredAsync('getPrice', LAYER);
  }

  calculatePrice(_query: CalculatePriceQuery): SdkAsyncResult<PriceCalculation> {
    return pricingNotConfiguredAsync('calculatePrice', LAYER);
  }

  applyCoupon(_query: ApplyCouponQuery): SdkAsyncResult<CouponApplication> {
    return pricingNotConfiguredAsync('applyCoupon', LAYER);
  }

  calculateTaxes(_query: CalculateTaxesQuery): SdkAsyncResult<TaxBreakdown> {
    return pricingNotConfiguredAsync('calculateTaxes', LAYER);
  }

  calculateDeliveryFee(_query: CalculateDeliveryFeeQuery): SdkAsyncResult<FeeResult> {
    return pricingNotConfiguredAsync('calculateDeliveryFee', LAYER);
  }

  calculatePackagingFee(_query: CalculatePackagingFeeQuery): SdkAsyncResult<FeeResult> {
    return pricingNotConfiguredAsync('calculatePackagingFee', LAYER);
  }

  calculateFinalBill(_query: CalculateFinalBillQuery): SdkAsyncResult<FinalBill> {
    return pricingNotConfiguredAsync('calculateFinalBill', LAYER);
  }

  validatePricing(_input: ValidatePricingInput): SdkResult<PricingValidationResult> {
    return pricingNotConfiguredSync('validatePricing', LAYER);
  }
}

export function createStubPricingAdapter(): PricingSDK {
  return new StubPricingAdapter();
}
