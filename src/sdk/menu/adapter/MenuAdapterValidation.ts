/**
 * Menu adapter validation (M7 PR-11).
 */

import type { TenantId } from '../../core/types';
import type {
  ComboQuery,
  MenuCategoryQuery,
  MenuItemQuery,
  MenuQuery,
} from '../dto';
import type { MenuItemId, ComboId } from '../types/branded';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';

export class MenuAdapterValidation {
  validateTenantId(tenantId: TenantId | undefined): SdkResult<void> {
    if (!tenantId || !String(tenantId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'tenantId is required' } };
    }
    return sdkOk(undefined);
  }

  validateBranchId(branchId: string | undefined): SdkResult<void> {
    if (branchId !== undefined && !String(branchId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'branchId must be non-empty when provided' } };
    }
    return sdkOk(undefined);
  }

  validateCatalogId(catalogId: string | undefined): SdkResult<void> {
    if (!catalogId || !String(catalogId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'catalogId is required' } };
    }
    return sdkOk(undefined);
  }

  validateMenuQuery(query: MenuQuery): SdkResult<void> {
    const tenant = this.validateTenantId(query.tenantId);
    if (!tenant.ok) return tenant;
    return this.validateBranchId(query.branchId);
  }

  validateMenuItemQuery(query: MenuItemQuery): SdkResult<void> {
    const tenant = this.validateTenantId(query.tenantId);
    if (!tenant.ok) return tenant;
    const branch = this.validateBranchId(query.branchId);
    if (!branch.ok) return branch;
    if (!query.itemId || !String(query.itemId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'itemId is required' } };
    }
    return sdkOk(undefined);
  }

  validateMenuCategoryQuery(query: MenuCategoryQuery): SdkResult<void> {
    const tenant = this.validateTenantId(query.tenantId);
    if (!tenant.ok) return tenant;
    return this.validateBranchId(query.branchId);
  }

  validateComboQuery(query: ComboQuery): SdkResult<void> {
    const tenant = this.validateTenantId(query.tenantId);
    if (!tenant.ok) return tenant;
    const branch = this.validateBranchId(query.branchId);
    if (!branch.ok) return branch;
    if (!query.comboId || !String(query.comboId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'comboId is required' } };
    }
    return sdkOk(undefined);
  }

  validateItemId(itemId: MenuItemId): SdkResult<void> {
    if (!itemId || !String(itemId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'itemId is required' } };
    }
    return sdkOk(undefined);
  }

  validateComboId(comboId: ComboId): SdkResult<void> {
    if (!comboId || !String(comboId).trim()) {
      return { ok: false, error: { code: 'VALIDATION', message: 'comboId is required' } };
    }
    return sdkOk(undefined);
  }
}

export function createMenuAdapterValidation(): MenuAdapterValidation {
  return new MenuAdapterValidation();
}
