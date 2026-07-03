/**
 * MenuSDK — SDK DTO ↔ domain mapping (M7 PR-4).
 * Structural mapping only — no business logic.
 */

import type { MenuCatalog as DomainMenuCatalog } from '../../../domain/menu/catalog/MenuCatalog';
import type { MenuCategory as DomainMenuCategory } from '../../../domain/menu/catalog/MenuCategory';
import type { MenuItem as DomainMenuItem } from '../../../domain/menu/catalog/MenuItem';
import type { Combo as DomainCombo } from '../../../domain/menu/combos/Combo';
import type { ModifierGroup as DomainModifierGroup } from '../../../domain/menu/modifiers/ModifierGroup';
import type { Modifier as DomainModifier } from '../../../domain/menu/modifiers/ModifierGroup';
import type { MenuAvailability as DomainMenuAvailability } from '../../../domain/menu/availability/MenuAvailability';
import type { PriceSnapshot as DomainPriceSnapshot } from '../../../domain/menu/pricing/PriceSnapshot';
import type { MenuDomainValidationResult } from '../../../domain/menu/shared/MenuDomainResult';
import type {
  AvailabilityReference,
  Combo,
  Menu,
  MenuCategory,
  MenuItem,
  MenuValidationIssue,
  MenuValidationResult,
  Modifier,
  ModifierGroup,
  PriceReference,
} from '../dto';

const mapPriceReferenceToDomain = (price: PriceReference): DomainPriceSnapshot => ({
  amount: price.amount,
  currency: price.currency,
});

const mapAvailabilityReferenceToDomain = (
  availability: AvailabilityReference
): DomainMenuAvailability => ({
  state: availability.available ? 'available' : 'unavailable',
  reason: availability.reason,
});

export const mapMenuCategoryDtoToDomain = (category: MenuCategory): DomainMenuCategory => ({
  categoryId: String(category.categoryId),
  name: category.name,
  description: category.description,
  sortOrder: category.sortOrder,
  itemIds: [...category.itemIds],
  active: category.active,
});

export const mapMenuItemDtoToDomain = (item: MenuItem): DomainMenuItem => ({
  itemId: String(item.itemId),
  name: item.name,
  description: item.description,
  categoryId: item.categoryId,
  price: mapPriceReferenceToDomain(item.price),
  availability: mapAvailabilityReferenceToDomain(item.availability),
  modifierGroupIds: item.modifierGroupIds ? [...item.modifierGroupIds] : undefined,
  branchOverrides: item.branchOverrides?.map((override) => ({
    branchId: override.branchId,
    price: override.price ? mapPriceReferenceToDomain(override.price) : undefined,
    availability: override.availability
      ? mapAvailabilityReferenceToDomain(override.availability)
      : undefined,
  })),
  active: item.active,
});

export const mapMenuDtoToDomainCatalog = (menu: Menu): DomainMenuCatalog => ({
  catalogId: String(menu.menuId),
  tenantId: String(menu.tenantId),
  name: menu.name,
  categories: menu.categories.map(mapMenuCategoryDtoToDomain),
  items: menu.items.map(mapMenuItemDtoToDomain),
  version: menu.version,
});

export const mapComboDtoToDomain = (combo: Combo): DomainCombo => ({
  comboId: String(combo.comboId),
  name: combo.name,
  description: combo.description,
  components: combo.components.map((component, index) => ({
    itemId: String(component.itemId),
    quantity: component.quantity,
    required: index === 0,
  })),
  price: mapPriceReferenceToDomain(combo.price),
  availability: mapAvailabilityReferenceToDomain(combo.availability),
  active: combo.active,
});

export const mapModifierDtoToDomain = (modifier: Modifier): DomainModifier => ({
  modifierId: String(modifier.modifierId),
  name: modifier.name,
  price: mapPriceReferenceToDomain(modifier.price),
  active: modifier.active,
});

export const mapModifierGroupDtoToDomain = (group: ModifierGroup): DomainModifierGroup => ({
  groupId: String(group.groupId),
  name: group.name,
  required: group.required,
  minSelections: group.minSelections,
  maxSelections: group.maxSelections,
  modifiers: group.modifiers.map(mapModifierDtoToDomain),
});

export const mapDomainValidationToMenuValidationResult = (
  result: MenuDomainValidationResult
): MenuValidationResult => {
  const issues: MenuValidationIssue[] = result.errors.map((error) => ({
    code: String(error.code),
    message: error.message,
    field: error.field,
  }));

  return {
    valid: result.valid,
    issues,
  };
};
