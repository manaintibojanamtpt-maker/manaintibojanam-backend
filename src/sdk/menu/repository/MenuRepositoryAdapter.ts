/**
 * MenuSDK — persistence-backed MenuRepository adapter (M7 PR-3).
 * Maps persistence records to SDK DTOs — no business validation.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkError, sdkFail } from '../../core/resultHelpers';
import type { MenuRepository } from './MenuRepository';
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
import { MENU_ERROR_MESSAGES } from '../errors/menuErrors';
import type { MenuPersistencePort } from './MenuRepositoryPorts';
import {
  filterActiveCategoryRecords,
  filterActiveItemRecords,
  mapCategoryRecord,
  mapComboRecord,
  mapMenuItemRecord,
  mapMenuRecordToMenu,
  mapPersistenceError,
  sortCategoryRecords,
} from './MenuRepositoryMapper';

const toPersistenceQuery = (query: MenuQuery | MenuCategoryQuery | MenuItemQuery | ComboQuery) => ({
  tenantId: String(query.tenantId),
  branchId: 'branchId' in query ? query.branchId : undefined,
  includeInactive: 'includeInactive' in query ? query.includeInactive : undefined,
});

export class MenuRepositoryAdapter implements MenuRepository {
  constructor(private readonly persistencePort: MenuPersistencePort) {}

  async getMenu(query: MenuQuery): SdkAsyncResult<Menu> {
    const persistenceQuery = toPersistenceQuery(query);
    const menuResult = await this.persistencePort.getMenu(persistenceQuery);
    if (!menuResult.ok) return mapPersistenceError(menuResult.error);

    const categoriesResult = await this.persistencePort.listCategories(persistenceQuery);
    if (!categoriesResult.ok) return mapPersistenceError(categoriesResult.error);

    const itemsResult = await this.persistencePort.listItems(persistenceQuery);
    if (!itemsResult.ok) return mapPersistenceError(itemsResult.error);

    const categories = sortCategoryRecords(
      filterActiveCategoryRecords(categoriesResult.value, persistenceQuery.includeInactive)
    );
    const items = filterActiveItemRecords(itemsResult.value, persistenceQuery.includeInactive);

    return { ok: true, value: mapMenuRecordToMenu(menuResult.value, categories, items) };
  }

  async getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    const result = await this.persistencePort.getMenuItem({
      tenantId: String(query.tenantId),
      itemId: String(query.itemId),
      branchId: query.branchId,
      includeInactive: undefined,
    });
    if (!result.ok) return mapPersistenceError(result.error);
    return { ok: true, value: mapMenuItemRecord(result.value) };
  }

  async listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    const persistenceQuery = toPersistenceQuery(query);
    const result = await this.persistencePort.listCategories(persistenceQuery);
    if (!result.ok) return mapPersistenceError(result.error);

    const categories = sortCategoryRecords(
      filterActiveCategoryRecords(result.value, persistenceQuery.includeInactive)
    );
    return { ok: true, value: categories.map(mapCategoryRecord) };
  }

  async getCombo(query: ComboQuery): SdkAsyncResult<Combo> {
    const persistenceQuery = toPersistenceQuery(query);
    const result = await this.persistencePort.listCombos(persistenceQuery);
    if (!result.ok) return mapPersistenceError(result.error);

    const combo = result.value.find((record) => record.comboId === String(query.comboId));
    if (!combo) {
      return sdkFail(sdkError('NOT_FOUND', MENU_ERROR_MESSAGES.COMBO_NOT_FOUND, { comboId: query.comboId }));
    }
    if (!persistenceQuery.includeInactive && !combo.active) {
      return sdkFail(sdkError('NOT_FOUND', MENU_ERROR_MESSAGES.COMBO_NOT_FOUND, { comboId: query.comboId }));
    }

    return { ok: true, value: mapComboRecord(combo) };
  }
}

export function createMenuRepositoryAdapter(
  persistencePort: MenuPersistencePort
): MenuRepository {
  return new MenuRepositoryAdapter(persistencePort);
}
