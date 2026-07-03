/**
 * Menu domain — catalog validation rules (M7 PR-2).
 */

import type { MenuCatalog } from './MenuCatalog';
import type { MenuCategory } from './MenuCategory';
import type { MenuItem } from './MenuItem';
import { validateAvailability } from '../availability/availabilityRules';
import { validatePriceSnapshot } from '../pricing/pricingRules';
import { MENU_REASON_CODES } from '../shared/MenuReasonCodes';
import {
  mergeValidationResults,
  type MenuDomainError,
  type MenuDomainValidationResult,
  menuValidationFailure,
  menuValidationSuccess,
} from '../shared/MenuDomainResult';

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const hasUniqueIds = (ids: readonly string[]): string | null => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) return id;
    seen.add(id);
  }
  return null;
};

export const validateCategory = (category: MenuCategory): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];
  if (!isNonEmptyString(category.categoryId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_CATEGORY_ID,
      message: 'Category ID is required',
      field: 'categoryId',
    });
  }
  if (!isNonEmptyString(category.name)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_NAME,
      message: 'Name cannot be empty',
      field: 'name',
    });
  }
  if (!Number.isInteger(category.sortOrder) || category.sortOrder < 0) {
    errors.push({
      code: MENU_REASON_CODES.INVALID_SORT_ORDER,
      message: 'Sort order must be a non-negative integer',
      field: 'sortOrder',
    });
  }
  return errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors);
};

export const validateMenuItem = (item: MenuItem): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];
  if (!isNonEmptyString(item.itemId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_ITEM_ID,
      message: 'Item ID is required',
      field: 'itemId',
    });
  }
  if (!isNonEmptyString(item.name)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_NAME,
      message: 'Name cannot be empty',
      field: 'name',
    });
  }
  if (!isNonEmptyString(item.categoryId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_CATEGORY_ID,
      message: 'Category ID is required',
      field: 'categoryId',
    });
  }
  const price = validatePriceSnapshot(item.price);
  const availability = validateAvailability(item.availability);
  return mergeValidationResults(
    errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors),
    price,
    availability
  );
};

export const validateCatalog = (catalog: MenuCatalog): MenuDomainValidationResult => {
  const errors: MenuDomainError[] = [];

  if (!isNonEmptyString(catalog.catalogId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_CATALOG_ID,
      message: 'Catalog ID is required',
      field: 'catalogId',
    });
  }
  if (!isNonEmptyString(catalog.tenantId)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_TENANT_ID,
      message: 'Tenant ID is required',
      field: 'tenantId',
    });
  }
  if (!isNonEmptyString(catalog.name)) {
    errors.push({
      code: MENU_REASON_CODES.EMPTY_NAME,
      message: 'Name cannot be empty',
      field: 'name',
    });
  }
  if (catalog.categories.length === 0 && catalog.items.length === 0) {
    errors.push({
      code: MENU_REASON_CODES.CATALOG_EMPTY,
      message: 'Catalog must contain at least one category or item',
      field: 'categories',
    });
  }

  const duplicateCategory = hasUniqueIds(catalog.categories.map((category) => category.categoryId));
  if (duplicateCategory) {
    errors.push({
      code: MENU_REASON_CODES.DUPLICATE_CATEGORY_ID,
      message: `Duplicate category ID detected: ${duplicateCategory}`,
      field: 'categories',
    });
  }

  const duplicateItem = hasUniqueIds(catalog.items.map((item) => item.itemId));
  if (duplicateItem) {
    errors.push({
      code: MENU_REASON_CODES.DUPLICATE_ITEM_ID,
      message: `Duplicate item ID detected: ${duplicateItem}`,
      field: 'items',
    });
  }

  const itemIds = new Set(catalog.items.map((item) => item.itemId));
  for (const category of catalog.categories) {
    for (const itemId of category.itemIds) {
      if (!itemIds.has(itemId)) {
        errors.push({
          code: MENU_REASON_CODES.ORPHAN_ITEM_REFERENCE,
          message: `Category ${category.categoryId} references unknown item ${itemId}`,
          field: 'categories',
        });
      }
    }
  }

  const categoryResults = catalog.categories.map((category) => validateCategory(category));
  const itemResults = catalog.items.map((item) => validateMenuItem(item));

  return mergeValidationResults(
    errors.length === 0 ? menuValidationSuccess() : menuValidationFailure(errors),
    ...categoryResults,
    ...itemResults
  );
};
