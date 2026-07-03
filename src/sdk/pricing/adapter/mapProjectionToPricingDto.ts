/**
 * Maps projection read model to Pricing SDK DTOs (M8 PR-11).
 * Internal normalization only — does not change public DTO contract.
 */

import type { TenantId, PriceListId } from '../types/branded';
import type { PriceResult } from '../dto';
import type { PricingContext } from '../dto/queries';
import type { PricingCatalogProjectionReadModel } from '../../../domain/pricing/projections/pricing/PricingProjectionState';

const ZERO_INR = { amount: 0, currency: 'INR' as const };

export function resolvePricingPriceListId(
  tenantId: TenantId,
  branchId?: string,
  priceListId?: PriceListId
): string {
  if (priceListId) return String(priceListId);
  return branchId ? `${tenantId}:${branchId}` : String(tenantId);
}

export function mapProjectionToPriceListDto(
  model: PricingCatalogProjectionReadModel,
  _query: PricingContext
): PriceResult {
  return {
    unitPrice: ZERO_INR,
    totalPrice: ZERO_INR,
    priceListVersion: model.pricingVersion,
  };
}

export function mapProjectionToPriceDto(
  model: PricingCatalogProjectionReadModel,
  _quantity = 1
): PriceResult {
  return {
    unitPrice: ZERO_INR,
    totalPrice: ZERO_INR,
    priceListVersion: model.pricingVersion,
  };
}

export function mapProjectionToPriceListEntryPlaceholders(
  model: PricingCatalogProjectionReadModel
): PriceResult[] {
  if (model.priceCount <= 0) return [];
  return Array.from({ length: model.priceCount }, (_, index) => ({
    unitPrice: ZERO_INR,
    totalPrice: ZERO_INR,
    priceListVersion: `${model.pricingVersion}:${index + 1}`,
  }));
}

export function mapProjectionsToPriceListDtos(
  models: readonly PricingCatalogProjectionReadModel[],
  _tenantId: TenantId
): PriceResult[] {
  return models.map((model) => mapProjectionToPriceListDto(model, { tenantId: model.tenantId as TenantId }));
}
