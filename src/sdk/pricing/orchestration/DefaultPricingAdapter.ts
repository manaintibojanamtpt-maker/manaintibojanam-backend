/**
 * PricingSDK — default orchestrated adapter (M8 PR-4).
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
import type { PricingRepository } from '../contracts/ports';
import {
  orchestrateApplyCoupon,
  orchestrateCalculateDeliveryFee,
  orchestrateCalculateFinalBill,
  orchestrateCalculatePackagingFee,
  orchestrateCalculatePrice,
  orchestrateCalculateTaxes,
  orchestrateGetPrice,
  orchestrateValidatePricing,
  type PricingSdkOrchestratorDeps,
} from './PricingSdkOrchestrator';
import type { PricingTelemetryHook } from './PricingTelemetry';

export interface DefaultPricingAdapterDeps {
  readonly repository: PricingRepository;
  readonly repositoryEnabled: boolean;
  readonly onTelemetry?: PricingTelemetryHook;
}

export class DefaultPricingAdapter implements PricingSDK {
  private readonly orchestratorDeps: PricingSdkOrchestratorDeps;

  constructor(deps: DefaultPricingAdapterDeps) {
    this.orchestratorDeps = {
      repository: deps.repository,
      repositoryEnabled: deps.repositoryEnabled,
      onTelemetry: deps.onTelemetry,
    };
  }

  getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult> {
    return orchestrateGetPrice(this.orchestratorDeps, query);
  }

  calculatePrice(query: CalculatePriceQuery): SdkAsyncResult<PriceCalculation> {
    return orchestrateCalculatePrice(this.orchestratorDeps, query);
  }

  applyCoupon(query: ApplyCouponQuery): SdkAsyncResult<CouponApplication> {
    return orchestrateApplyCoupon(this.orchestratorDeps, query);
  }

  calculateTaxes(query: CalculateTaxesQuery): SdkAsyncResult<TaxBreakdown> {
    return orchestrateCalculateTaxes(this.orchestratorDeps, query);
  }

  calculateDeliveryFee(query: CalculateDeliveryFeeQuery): SdkAsyncResult<FeeResult> {
    return orchestrateCalculateDeliveryFee(this.orchestratorDeps, query);
  }

  calculatePackagingFee(query: CalculatePackagingFeeQuery): SdkAsyncResult<FeeResult> {
    return orchestrateCalculatePackagingFee(this.orchestratorDeps, query);
  }

  calculateFinalBill(query: CalculateFinalBillQuery): SdkAsyncResult<FinalBill> {
    return orchestrateCalculateFinalBill(this.orchestratorDeps, query);
  }

  validatePricing(input: ValidatePricingInput): SdkResult<PricingValidationResult> {
    return orchestrateValidatePricing(this.orchestratorDeps, input);
  }
}

export function createDefaultPricingAdapter(deps: DefaultPricingAdapterDeps): PricingSDK {
  return new DefaultPricingAdapter(deps);
}
