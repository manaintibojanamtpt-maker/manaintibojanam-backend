/**
 * Pricing read adapter ports (M8 PR-11).
 * Additive contracts — does not modify frozen PricingSDK public API.
 */

import type { TenantId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import type { GetPriceQuery, PricingContext } from '../dto';
import type { PriceResult } from '../dto';
import type { PricingCatalogProjectionReadModel } from '../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { PricingAdapterDecision } from '../../../domain/pricing/adapter/PricingAdapterDecision';

export interface LegacyPricingReadPort {
  getPriceList(query: PricingContext): SdkAsyncResult<PriceResult>;
  getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult>;
  listPriceListEntries(query: PricingContext): SdkAsyncResult<PriceResult[]>;
}

export interface ProjectionPricingReadPort {
  getCatalog(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null>;
  getPriceListByTenant(
    tenantId: TenantId,
    branchId?: string,
    priceListId?: string
  ): SdkAsyncResult<PricingCatalogProjectionReadModel | null>;
  isHealthy(): SdkAsyncResult<boolean>;
}

export interface PricingAdapterReadinessPort {
  isProjectionReady(): SdkAsyncResult<boolean>;
  isOperationalGreen(): SdkAsyncResult<boolean>;
}

export interface PricingReadAdapterPort {
  getPriceList(query: PricingContext): SdkAsyncResult<PriceResult>;
  getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult>;
  listPriceListEntries(query: PricingContext): SdkAsyncResult<PriceResult[]>;
  resolveDecision(): SdkAsyncResult<PricingAdapterDecision>;
}
