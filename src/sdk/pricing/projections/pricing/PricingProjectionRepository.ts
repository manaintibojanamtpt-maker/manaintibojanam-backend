/**
 * Pricing catalog shadow projection repository — in-memory store (M8 PR-7).
 */

import type { PricingProjectionRepositoryPort } from './pricingProjectionPorts';
import type { PricingCatalogProjectionReadModel } from '../../../../domain/pricing/projections/pricing/PricingProjectionState';
import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';

export class PricingCatalogProjectionRepository implements PricingProjectionRepositoryPort {
  private readonly store = new Map<string, PricingCatalogProjectionReadModel>();

  save(model: PricingCatalogProjectionReadModel): SdkAsyncResult<void> {
    this.store.set(model.priceListId, model);
    return Promise.resolve(sdkOk(undefined));
  }

  load(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null> {
    return Promise.resolve(sdkOk(this.store.get(priceListId) ?? null));
  }

  get(priceListId: string): SdkAsyncResult<PricingCatalogProjectionReadModel | null> {
    return this.load(priceListId);
  }

  listByTenant(
    tenantId: string,
    limit: number
  ): SdkAsyncResult<PricingCatalogProjectionReadModel[]> {
    const items = [...this.store.values()]
      .filter((model) => model.tenantId === tenantId)
      .slice(0, limit);
    return Promise.resolve(sdkOk(items));
  }

  count(): SdkAsyncResult<number> {
    return Promise.resolve(sdkOk(this.store.size));
  }

  delete(priceListId: string): SdkAsyncResult<void> {
    this.store.delete(priceListId);
    return Promise.resolve(sdkOk(undefined));
  }
}

export function createPricingCatalogProjectionRepository(): PricingProjectionRepositoryPort {
  return new PricingCatalogProjectionRepository();
}

/** @deprecated Use createPricingCatalogProjectionRepository */
export const createPricingProjectionRepository = createPricingCatalogProjectionRepository;
