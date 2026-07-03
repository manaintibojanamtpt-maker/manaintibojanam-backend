/**
 * PricingSDK — persistence-backed PricingRepository adapter (M8 PR-3).
 * Maps persistence records to SDK DTOs — no business validation or pricing calculations.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import type { PricingRepository } from '../contracts/ports';
import type {
  CalculatePriceQuery,
  GetPriceQuery,
  PriceCalculation,
} from '../dto';
import type { BranchId, PriceListId, TenantId } from '../types/branded';
import { PRICING_ERROR_MESSAGES } from '../errors/pricingErrors';
import type { PricingPersistencePort } from './PricingRepositoryPorts';
import {
  mapBranchPricingFromPriceList,
  mapPersistenceError,
  mapPriceListRecord,
  mapPriceRecordToPriceResult,
  normalizeBranchId,
  normalizeItemId,
  normalizePriceListId,
  normalizeTenantId,
} from './PricingRepositoryMapper';

export class PricingRepositoryAdapter implements PricingRepository {
  constructor(private readonly persistencePort: PricingPersistencePort) {}

  async getPrice(query: GetPriceQuery): SdkAsyncResult<import('../dto').PriceResult> {
    const result = await this.persistencePort.loadPrice({
      tenantId: normalizeTenantId(query.tenantId),
      itemId: normalizeItemId(query.itemId),
      branchId: normalizeBranchId(query.branchId),
      priceListId: query.priceListId ? normalizePriceListId(query.priceListId) : undefined,
      includeInactive: false,
    });
    if (!result.ok) return mapPersistenceError(result.error);
    if (!result.value.active) {
      return sdkFail(
        sdkError('NOT_FOUND', PRICING_ERROR_MESSAGES.NOT_CONFIGURED, {
          itemId: query.itemId,
        })
      );
    }
    return {
      ok: true,
      value: mapPriceRecordToPriceResult(result.value, query.quantity ?? 1),
    };
  }

  async calculatePrice(_query: CalculatePriceQuery): SdkAsyncResult<PriceCalculation> {
    return sdkFail(
      sdkError('NOT_CONFIGURED', PRICING_ERROR_MESSAGES.NOT_CONFIGURED, {
        pricingCode: 'CALCULATION_NOT_IN_REPOSITORY',
        provider: 'PricingRepositoryAdapter',
      })
    );
  }

  async getPriceList(
    tenantId: TenantId,
    priceListId: PriceListId
  ): SdkAsyncResult<ReturnType<typeof mapPriceListRecord>> {
    const result = await this.persistencePort.loadPriceList({
      tenantId: normalizeTenantId(tenantId),
      priceListId: normalizePriceListId(priceListId),
      includeInactive: false,
    });
    if (!result.ok) return mapPersistenceError(result.error);
    if (!result.value.active) {
      return sdkFail(
        sdkError('NOT_FOUND', PRICING_ERROR_MESSAGES.NOT_CONFIGURED, { priceListId })
      );
    }
    return { ok: true, value: mapPriceListRecord(result.value) };
  }

  async getBranchPricing(
    _tenantId: TenantId,
    _branchId: BranchId
  ): SdkAsyncResult<ReturnType<typeof mapBranchPricingFromPriceList>> {
    return sdkFail(
      sdkError('NOT_CONFIGURED', PRICING_ERROR_MESSAGES.NOT_CONFIGURED, {
        pricingCode: 'BRANCH_PRICING_REQUIRES_PRICE_LIST_CONTEXT',
        provider: 'PricingRepositoryAdapter',
      })
    );
  }
}

export function createPricingRepositoryAdapter(
  persistencePort: PricingPersistencePort
): PricingRepository {
  return new PricingRepositoryAdapter(persistencePort);
}

export async function validatePricingPersistenceConnection(
  persistencePort: PricingPersistencePort
): SdkAsyncResult<{ readonly ok: true }> {
  const result = await persistencePort.validateConnection();
  if (!result.ok) return mapPersistenceError(result.error);
  return result;
}

export async function searchPricingRecords(
  persistencePort: PricingPersistencePort,
  query: Parameters<PricingPersistencePort['searchPricing']>[0]
) {
  const result = await persistencePort.searchPricing(query);
  if (!result.ok) return mapPersistenceError(result.error);
  return { ok: true as const, value: result.value };
}
