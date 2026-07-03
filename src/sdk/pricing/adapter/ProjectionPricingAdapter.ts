/**
 * Projection pricing read adapter (M8 PR-11).
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk, sdkFail, sdkError } from '../../core/resultHelpers';
import type { GetPriceQuery, PricingContext } from '../dto';
import type { PriceResult } from '../dto';
import type { ProjectionPricingReadPort } from './pricingAdapterPorts';
import {
  mapProjectionToPriceDto,
  mapProjectionToPriceListDto,
  mapProjectionToPriceListEntryPlaceholders,
  resolvePricingPriceListId,
} from './mapProjectionToPricingDto';

export class ProjectionPricingAdapter {
  constructor(private readonly repository: ProjectionPricingReadPort) {}

  async getPriceList(query: PricingContext): SdkAsyncResult<PriceResult> {
    const result = await this.repository.getPriceListByTenant(
      query.tenantId,
      query.branchId,
      query.priceListId
    );
    if (!result.ok) return result;
    if (!result.value) {
      return sdkFail(
        sdkError('NOT_FOUND', 'Price list not found in projection', {
          tenantId: query.tenantId,
          branchId: query.branchId,
        })
      );
    }
    try {
      return sdkOk(mapProjectionToPriceListDto(result.value, query));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection price list'));
    }
  }

  async getPrice(query: GetPriceQuery): SdkAsyncResult<PriceResult> {
    const catalog = await this.repository.getPriceListByTenant(
      query.tenantId,
      query.branchId,
      query.priceListId
    );
    if (!catalog.ok) return catalog;
    if (!catalog.value) {
      return sdkFail(sdkError('NOT_FOUND', 'Price list not found in projection'));
    }
    if (catalog.value.priceCount <= 0) {
      return sdkFail(sdkError('NOT_FOUND', 'Price not found in projection'));
    }
    try {
      return sdkOk(mapProjectionToPriceDto(catalog.value, query.quantity ?? 1));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection price'));
    }
  }

  async listPriceListEntries(query: PricingContext): SdkAsyncResult<PriceResult[]> {
    const catalog = await this.repository.getPriceListByTenant(
      query.tenantId,
      query.branchId,
      query.priceListId
    );
    if (!catalog.ok) return catalog;
    if (!catalog.value) {
      return sdkFail(sdkError('NOT_FOUND', 'Price list not found in projection'));
    }
    try {
      return sdkOk(mapProjectionToPriceListEntryPlaceholders(catalog.value));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection price list entries'));
    }
  }

  resolvePriceListId(query: PricingContext): string {
    return resolvePricingPriceListId(query.tenantId, query.branchId, query.priceListId);
  }
}

export function createProjectionPricingAdapter(
  repository: ProjectionPricingReadPort
): ProjectionPricingAdapter {
  return new ProjectionPricingAdapter(repository);
}
