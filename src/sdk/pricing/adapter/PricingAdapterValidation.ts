/**
 * Pricing adapter validation (M8 PR-11).
 */

import type { TenantId } from '../../core/types';
import type { GetPriceQuery, PricingContext } from '../dto';
import type { MenuItemId, PriceListId } from '../types/branded';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class PricingAdapterValidation {
  validateTenantId(tenantId: TenantId | undefined): SdkResult<void> {
    if (!tenantId || !String(tenantId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'tenantId is required' } };
    }
    return sdkOk(undefined);
  }

  validateBranchId(branchId: string | undefined): SdkResult<void> {
    if (branchId !== undefined && !String(branchId).trim()) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'branchId must be non-empty when provided' },
      };
    }
    return sdkOk(undefined);
  }

  validatePriceListId(priceListId: PriceListId | undefined): SdkResult<void> {
    if (priceListId !== undefined && !String(priceListId).trim()) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'priceListId must be non-empty when provided' },
      };
    }
    return sdkOk(undefined);
  }

  validatePricingContext(query: PricingContext): SdkResult<void> {
    const tenant = this.validateTenantId(query.tenantId);
    if (!tenant.ok) return tenant;
    const branch = this.validateBranchId(query.branchId);
    if (!branch.ok) return branch;
    return this.validatePriceListId(query.priceListId);
  }

  validateGetPriceQuery(query: GetPriceQuery): SdkResult<void> {
    const context = this.validatePricingContext(query);
    if (!context.ok) return context;
    if (!query.itemId || !String(query.itemId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'itemId is required' } };
    }
    return sdkOk(undefined);
  }

  validateItemId(itemId: MenuItemId): SdkResult<void> {
    if (!itemId || !String(itemId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'itemId is required' } };
    }
    return sdkOk(undefined);
  }
}

export function createPricingAdapterValidation(): PricingAdapterValidation {
  return new PricingAdapterValidation();
}
