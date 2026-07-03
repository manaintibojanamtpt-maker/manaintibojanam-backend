/**
 * Projection menu read adapter (M7 PR-11).
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk, sdkFail, sdkError } from '../../core/resultHelpers';
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
import type { ProjectionMenuReadPort } from './menuAdapterPorts';
import {
  mapProjectionToComboPlaceholder,
  mapProjectionToMenuCategoryPlaceholders,
  mapProjectionToMenuDto,
  mapProjectionToMenuItemPlaceholder,
  resolveMenuCatalogId,
} from './mapProjectionToMenuDto';

export class ProjectionMenuAdapter {
  constructor(private readonly repository: ProjectionMenuReadPort) {}

  async getMenu(query: MenuQuery): SdkAsyncResult<Menu> {
    const result = await this.repository.getMenuByTenant(query.tenantId, query.branchId);
    if (!result.ok) return result;
    if (!result.value) {
      return sdkFail(
        sdkError('NOT_FOUND', 'Menu catalog not found in projection', {
          tenantId: query.tenantId,
          branchId: query.branchId,
        })
      );
    }
    try {
      return sdkOk(mapProjectionToMenuDto(result.value, query));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection menu'));
    }
  }

  async getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    const catalog = await this.repository.getMenuByTenant(query.tenantId, query.branchId);
    if (!catalog.ok) return catalog;
    if (!catalog.value) {
      return sdkFail(sdkError('NOT_FOUND', 'Menu catalog not found in projection'));
    }
    if (catalog.value.itemCount <= 0) {
      return sdkFail(sdkError('NOT_FOUND', 'Menu item not found in projection'));
    }
    try {
      return sdkOk(mapProjectionToMenuItemPlaceholder(catalog.value, query.itemId));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection menu item'));
    }
  }

  async listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    const catalog = await this.repository.getMenuByTenant(query.tenantId, query.branchId);
    if (!catalog.ok) return catalog;
    if (!catalog.value) {
      return sdkFail(sdkError('NOT_FOUND', 'Menu catalog not found in projection'));
    }
    try {
      return sdkOk(mapProjectionToMenuCategoryPlaceholders(catalog.value));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection categories'));
    }
  }

  async getCombo(query: ComboQuery): SdkAsyncResult<Combo> {
    const catalog = await this.repository.getMenuByTenant(query.tenantId, query.branchId);
    if (!catalog.ok) return catalog;
    if (!catalog.value) {
      return sdkFail(sdkError('NOT_FOUND', 'Menu catalog not found in projection'));
    }
    if (catalog.value.comboCount <= 0) {
      return sdkFail(sdkError('NOT_FOUND', 'Combo not found in projection'));
    }
    try {
      return sdkOk(mapProjectionToComboPlaceholder(catalog.value, query.comboId));
    } catch {
      return sdkFail(sdkError('MAPPER_FAILED', 'Failed to map projection combo'));
    }
  }

  resolveCatalogId(query: MenuQuery): string {
    return resolveMenuCatalogId(query.tenantId, query.branchId);
  }
}

export function createProjectionMenuAdapter(
  repository: ProjectionMenuReadPort
): ProjectionMenuAdapter {
  return new ProjectionMenuAdapter(repository);
}
