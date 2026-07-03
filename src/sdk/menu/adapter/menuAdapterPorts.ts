/**
 * Menu read adapter ports (M7 PR-11).
 * Additive contracts — does not modify frozen MenuSDK public API.
 */

import type { TenantId } from '../../core/types';
import type { SdkAsyncResult } from '../../core/result';
import type {
  Combo,
  ComboQuery,
  Menu,
  MenuCategory,
  MenuCategoryQuery,
  MenuItem,
  MenuItemQuery,
  MenuQuery,
} from '../dto';
import type { MenuCatalogProjectionReadModel } from '../../../domain/menu/projections/menu/MenuProjectionState';
import type { MenuAdapterDecision } from '../../../domain/menu/adapter/MenuAdapterDecision';

export interface LegacyMenuReadPort {
  getMenu(query: MenuQuery): SdkAsyncResult<Menu>;
  getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem>;
  listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]>;
  getCombo(query: ComboQuery): SdkAsyncResult<Combo>;
}

export interface ProjectionMenuReadPort {
  getCatalog(catalogId: string): SdkAsyncResult<MenuCatalogProjectionReadModel | null>;
  getMenuByTenant(tenantId: TenantId, branchId?: string): SdkAsyncResult<MenuCatalogProjectionReadModel | null>;
  isHealthy(): SdkAsyncResult<boolean>;
}

export interface MenuAdapterReadinessPort {
  isProjectionReady(): SdkAsyncResult<boolean>;
  isOperationalGreen(): SdkAsyncResult<boolean>;
}

export interface MenuReadAdapterPort {
  getMenu(query: MenuQuery): SdkAsyncResult<Menu>;
  getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem>;
  listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]>;
  getCombo(query: ComboQuery): SdkAsyncResult<Combo>;
  resolveDecision(): SdkAsyncResult<MenuAdapterDecision>;
}
