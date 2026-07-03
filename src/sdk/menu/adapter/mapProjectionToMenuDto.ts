/**
 * Maps projection read model to Menu SDK DTOs (M7 PR-11).
 * Internal normalization only — does not change public DTO contract.
 */

import type { TenantId } from '../../core/types';
import type { Menu, MenuCategory, MenuItem, Combo } from '../dto';
import type { MenuId, MenuItemId, MenuCategoryId, ComboId, MenuTimestamp } from '../types/branded';
import type { MenuCatalogProjectionReadModel } from '../../../domain/menu/projections/menu/MenuProjectionState';
import type { MenuQuery } from '../dto/queries';

export function resolveMenuCatalogId(tenantId: TenantId, branchId?: string): string {
  return branchId ? `${tenantId}:${branchId}` : String(tenantId);
}

export function mapProjectionToMenuDto(
  model: MenuCatalogProjectionReadModel,
  query: MenuQuery
): Menu {
  return {
    menuId: model.catalogId as MenuId,
    tenantId: model.tenantId as TenantId,
    name: `Catalog ${model.catalogId}`,
    categories: [],
    items: [],
    metadata: {
      source: 'projection',
      schemaVersion: model.projectionVersion,
      itemCount: model.itemCount,
      categoryCount: model.categoryCount,
      generatedAt: model.updatedAt as MenuTimestamp,
    },
    version: model.catalogVersion,
    updatedAt: model.updatedAt as MenuTimestamp,
  };
}

export function mapProjectionToMenuCategoryPlaceholders(
  model: MenuCatalogProjectionReadModel
): MenuCategory[] {
  if (model.categoryCount <= 0) return [];
  return Array.from({ length: model.categoryCount }, (_, index) => ({
    categoryId: `${model.catalogId}-category-${index + 1}` as MenuCategoryId,
    name: `Category ${index + 1}`,
    sortOrder: index,
    itemIds: [],
    active: model.status !== 'inactive',
  }));
}

export function mapProjectionToMenuItemPlaceholder(
  model: MenuCatalogProjectionReadModel,
  itemId: MenuItemId
): MenuItem {
  return {
    itemId,
    name: `Projection item ${itemId}`,
    kind: 'item',
    categoryId: `${model.catalogId}-category-1`,
    price: { amount: 0, currency: 'INR' },
    availability: { available: model.status !== 'inactive' },
    active: model.status !== 'inactive',
  };
}

export function mapProjectionToComboPlaceholder(
  model: MenuCatalogProjectionReadModel,
  comboId: ComboId
): Combo {
  return {
    comboId,
    name: `Projection combo ${comboId}`,
    components: [],
    price: { amount: 0, currency: 'INR' },
    availability: { available: model.status !== 'inactive' },
    active: model.status !== 'inactive',
  };
}

export function mapProjectionsToMenuDtos(
  models: readonly MenuCatalogProjectionReadModel[],
  tenantId: TenantId
): Menu[] {
  return models.map((model) =>
    mapProjectionToMenuDto(model, { tenantId, branchId: model.branchId })
  );
}
