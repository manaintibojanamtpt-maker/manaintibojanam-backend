/**
 * MenuSDK — persistence to DTO mapping (M7 PR-3).
 * Mapping only — no business validation.
 */

import type {
  Combo,
  Menu,
  MenuCategory,
  MenuItem,
  MenuMetadata,
  MenuSearchHit,
  MenuSearchResult,
  Modifier,
  ModifierGroup,
  AvailabilityReference,
  BranchOverrideReference,
  PriceReference,
} from '../dto';
import type {
  AvailabilityRecord,
  BranchOverrideRecord,
  CategoryRecord,
  ComboRecord,
  MenuItemRecord,
  MenuRecord,
  MenuSearchRecordHit,
  MenuSearchRecordResult,
  ModifierGroupRecord,
  ModifierRecord,
  PriceRecord,
} from './MenuPersistenceModels';
import type { ComboId, MenuCategoryId, MenuId, MenuItemId, ModifierGroupId, ModifierId, MenuItemKind } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { SdkError, SdkErrorCode } from '../../core/errors';
import type { SdkFailure } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import { MENU_ERROR_MESSAGES } from '../errors/menuErrors';

const PERSISTENCE_ERROR_CODES: readonly SdkErrorCode[] = [
  'NOT_FOUND',
  'UNAVAILABLE',
  'NOT_CONFIGURED',
  'VALIDATION',
];

export const mapPersistenceError = (error: SdkError): SdkFailure => {
  if (PERSISTENCE_ERROR_CODES.includes(error.code)) {
    return sdkFail(error);
  }
  return sdkFail(
    sdkError('UNAVAILABLE', error.message || MENU_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
      menuCode: error.code,
      ...error.details,
    })
  );
};

export const mapPriceRecord = (record: PriceRecord): PriceReference => ({
  amount: record.amount,
  currency: record.currency,
});

export const mapAvailabilityRecord = (record: AvailabilityRecord): AvailabilityReference => ({
  available: record.available,
  reason: record.reason,
});

export const mapBranchOverrideRecord = (
  record: BranchOverrideRecord
): BranchOverrideReference => ({
  branchId: record.branchId,
  price: record.price ? mapPriceRecord(record.price) : undefined,
  availability: record.availability ? mapAvailabilityRecord(record.availability) : undefined,
});

export const mapCategoryRecord = (record: CategoryRecord): MenuCategory => ({
  categoryId: record.categoryId as MenuCategoryId,
  name: record.name,
  description: record.description,
  sortOrder: record.sortOrder,
  itemIds: [...record.itemIds],
  active: record.active,
});

export const mapMenuItemRecord = (record: MenuItemRecord): MenuItem => ({
  itemId: record.itemId as MenuItemId,
  name: record.name,
  description: record.description,
  kind: record.kind as MenuItemKind,
  categoryId: record.categoryId,
  price: mapPriceRecord(record.price),
  availability: mapAvailabilityRecord(record.availability),
  branchOverrides: record.branchOverrides?.map(mapBranchOverrideRecord),
  modifierGroupIds: record.modifierGroupIds ? [...record.modifierGroupIds] : undefined,
  tags: record.tags ? [...record.tags] : undefined,
  active: record.active,
});

export const mapModifierRecord = (record: ModifierRecord): Modifier => ({
  modifierId: record.modifierId as ModifierId,
  name: record.name,
  price: mapPriceRecord(record.price),
  active: record.active,
});

export const mapModifierGroupRecord = (record: ModifierGroupRecord): ModifierGroup => ({
  groupId: record.groupId as ModifierGroupId,
  name: record.name,
  required: record.required,
  minSelections: record.minSelections,
  maxSelections: record.maxSelections,
  modifiers: record.modifiers.map(mapModifierRecord),
});

export const mapComboRecord = (record: ComboRecord): Combo => ({
  comboId: record.comboId as ComboId,
  name: record.name,
  description: record.description,
  components: record.components.map((component) => ({
    itemId: component.itemId as MenuItemId,
    quantity: component.quantity,
  })),
  price: mapPriceRecord(record.price),
  availability: mapAvailabilityRecord(record.availability),
  active: record.active,
});

export const sortCategoryRecords = (
  records: readonly CategoryRecord[]
): readonly CategoryRecord[] =>
  [...records].sort((left, right) => left.sortOrder - right.sortOrder);

export const filterActiveCategoryRecords = (
  records: readonly CategoryRecord[],
  includeInactive = false
): readonly CategoryRecord[] =>
  includeInactive ? records : records.filter((record) => record.active);

export const filterActiveItemRecords = (
  records: readonly MenuItemRecord[],
  includeInactive = false
): readonly MenuItemRecord[] =>
  includeInactive ? records : records.filter((record) => record.active);

export const mapMenuRecordToMenu = (
  menu: MenuRecord,
  categories: readonly CategoryRecord[],
  items: readonly MenuItemRecord[]
): Menu => {
  const metadata: MenuMetadata = {
    source: menu.metadataSource,
    schemaVersion: menu.metadataSchemaVersion,
    itemCount: items.length,
    categoryCount: categories.length,
    generatedAt: menu.updatedAt,
  };

  return {
    menuId: menu.menuId as MenuId,
    tenantId: menu.tenantId as TenantId,
    name: menu.name,
    categories: categories.map(mapCategoryRecord),
    items: items.map(mapMenuItemRecord),
    metadata,
    version: menu.version,
    updatedAt: menu.updatedAt,
  };
};

export const mapMenuSearchRecordResult = (result: MenuSearchRecordResult): MenuSearchResult => {
  const hits: MenuSearchHit[] = result.hits.map((hit: MenuSearchRecordHit) => ({
    item: mapMenuItemRecord(hit.item),
    score: hit.score,
    matchedFields: [...hit.matchedFields],
  }));

  return {
    hits,
    categories: result.categories.map(mapCategoryRecord),
    totalHits: result.totalHits,
    queryText: result.queryText,
  };
};
