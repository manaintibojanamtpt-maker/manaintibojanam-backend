/**
 * MenuSDK — query DTOs (M7 PR-1).
 */

import type { TenantId } from '../../core/types';
import type { MenuItemId, MenuCategoryId, ComboId, ModifierGroupId } from '../types/branded';

export interface MenuQuery {
  readonly tenantId: TenantId;
  readonly branchId?: string;
  readonly includeInactive?: boolean;
}

export interface MenuItemQuery {
  readonly tenantId: TenantId;
  readonly itemId: MenuItemId;
  readonly branchId?: string;
}

export interface MenuCategoryQuery {
  readonly tenantId: TenantId;
  readonly branchId?: string;
}

export interface ModifierGroupQuery {
  readonly tenantId: TenantId;
  readonly groupId: ModifierGroupId;
  readonly branchId?: string;
}

export interface ComboQuery {
  readonly tenantId: TenantId;
  readonly comboId: ComboId;
  readonly branchId?: string;
}

export interface MenuSearchQuery {
  readonly tenantId: TenantId;
  readonly text: string;
  readonly branchId?: string;
  readonly categoryId?: MenuCategoryId;
  readonly limit?: number;
}

export interface MenuValidationInput {
  readonly tenantId: TenantId;
  readonly branchId?: string;
}
