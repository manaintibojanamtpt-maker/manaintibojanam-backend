/**
 * PricingSDK — repository and calculator ports (M8 PR-1).
 * Contracts only — no implementations in PR-1.
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  GetPriceQuery,
  CalculatePriceQuery,
  PriceResult,
  PriceCalculation,
} from '../dto';
import type { PriceListId, TenantId, BranchId } from '../types/branded';

export interface PricingRepository {
  getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult>;
  calculatePrice(query: CalculatePriceQuery): SdkAsyncResult<PriceCalculation>;
  getPriceList(tenantId: TenantId, priceListId: PriceListId): SdkAsyncResult<unknown>;
  getBranchPricing(tenantId: TenantId, branchId: BranchId): SdkAsyncResult<unknown>;
}

export interface TaxRepository {
  getTaxRules(tenantId: TenantId, regionCode?: string): SdkAsyncResult<unknown>;
}

export interface CouponRepository {
  resolveCoupon(tenantId: TenantId, couponCode: string): SdkAsyncResult<unknown>;
}

export interface CampaignRepository {
  getActiveCampaigns(tenantId: TenantId): SdkAsyncResult<unknown>;
}

export interface OfferRepository {
  getActiveOffers(tenantId: TenantId, branchId?: BranchId): SdkAsyncResult<unknown>;
}

export interface PricingCalculator {
  calculateTaxes(input: unknown): SdkAsyncResult<unknown>;
  calculateDeliveryFee(input: unknown): SdkAsyncResult<unknown>;
  calculatePackagingFee(input: unknown): SdkAsyncResult<unknown>;
  calculateFinalBill(input: unknown): SdkAsyncResult<unknown>;
}
