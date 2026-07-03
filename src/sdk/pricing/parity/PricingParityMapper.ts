/**
 * Pricing parity mapper (M8 PR-8).
 * Normalizes legacy documents and projection read models to canonical catalog views.
 */

import type { LegacyPricingCatalogDocument } from '../../../domain/pricing/parity/PricingCanonicalModel';
import {
  normalizePricingParityStatus,
  resolvePricingParityTimestamp,
  type PricingCanonicalModel,
} from '../../../domain/pricing/parity/PricingCanonicalModel';
import type { PricingCatalogProjectionReadModel } from '../../../domain/pricing/projections/pricing/PricingProjectionState';

export class PricingParityMapper {
  mapLegacy(document: LegacyPricingCatalogDocument): PricingCanonicalModel {
    const updatedAt = resolvePricingParityTimestamp(document.updatedAt, new Date(0).toISOString());

    return {
      priceListId: document.priceListId,
      tenantId: document.tenantId,
      branchId: document.branchId,
      pricingVersion: document.pricingVersion,
      status: normalizePricingParityStatus(document.status),
      priceCount: document.priceCount,
      couponCount: document.couponCount,
      campaignCount: document.campaignCount,
      offerCount: document.offerCount,
      updatedAt,
    };
  }

  mapProjection(model: PricingCatalogProjectionReadModel): PricingCanonicalModel {
    return {
      priceListId: model.priceListId,
      tenantId: model.tenantId,
      branchId: model.branchId,
      pricingVersion: model.pricingVersion,
      status: normalizePricingParityStatus(model.status),
      priceCount: model.priceCount,
      couponCount: model.couponCount,
      campaignCount: model.campaignCount,
      offerCount: model.offerCount,
      updatedAt: model.updatedAt,
    };
  }
}

export function createPricingParityMapper(): PricingParityMapper {
  return new PricingParityMapper();
}
