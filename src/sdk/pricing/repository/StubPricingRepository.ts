/**
 * PricingSDK — stub pricing repository (M8 PR-3).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { PricingRepository } from '../contracts/ports';
import type {
  CalculatePriceQuery,
  GetPriceQuery,
  PriceCalculation,
  PriceResult,
} from '../dto';
import type { BranchId, PriceListId, TenantId } from '../types/branded';
import { pricingNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'StubPricingRepository';

export class StubPricingRepository implements PricingRepository {
  getPrice(_query: GetPriceQuery): SdkAsyncResult<PriceResult> {
    return pricingNotConfiguredAsync('getPrice', LAYER);
  }

  calculatePrice(_query: CalculatePriceQuery): SdkAsyncResult<PriceCalculation> {
    return pricingNotConfiguredAsync('calculatePrice', LAYER);
  }

  getPriceList(_tenantId: TenantId, _priceListId: PriceListId): SdkAsyncResult<unknown> {
    return pricingNotConfiguredAsync('getPriceList', LAYER);
  }

  getBranchPricing(_tenantId: TenantId, _branchId: BranchId): SdkAsyncResult<unknown> {
    return pricingNotConfiguredAsync('getBranchPricing', LAYER);
  }
}

export function createStubPricingRepository(): PricingRepository {
  return new StubPricingRepository();
}
