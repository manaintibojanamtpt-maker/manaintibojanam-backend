/**
 * PricingSDK — public contract (M8 PR-1).
 *
 * Provider-neutral pricing & commerce platform contract.
 * No Firestore, REST, GST logic, or UI in this contract.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
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
import type { CreatePricingSDKOptions } from '../shared/options';

export interface PricingSDK {
  getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult>;
  calculatePrice(query: CalculatePriceQuery): SdkAsyncResult<PriceCalculation>;
  applyCoupon(query: ApplyCouponQuery): SdkAsyncResult<CouponApplication>;
  calculateTaxes(query: CalculateTaxesQuery): SdkAsyncResult<TaxBreakdown>;
  calculateDeliveryFee(query: CalculateDeliveryFeeQuery): SdkAsyncResult<FeeResult>;
  calculatePackagingFee(query: CalculatePackagingFeeQuery): SdkAsyncResult<FeeResult>;
  calculateFinalBill(query: CalculateFinalBillQuery): SdkAsyncResult<FinalBill>;
  validatePricing(input: ValidatePricingInput): SdkResult<PricingValidationResult>;
}

export interface PricingSDKFactory {
  create(options?: CreatePricingSDKOptions): PricingSDK;
}
