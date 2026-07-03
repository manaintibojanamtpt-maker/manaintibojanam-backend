/**
 * MenuSDK — persistence port and repository options (M7 PR-3).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { MenuRepository } from './MenuRepository';
import type { MenuFeatureFlagReader } from '../featureFlags/featureFlags';
import type {
  CategoryRecord,
  ComboRecord,
  MenuItemRecord,
  MenuRecord,
  MenuSearchRecordResult,
  ModifierGroupRecord,
} from './MenuPersistenceModels';

export interface MenuPersistenceQuery {
  readonly tenantId: string;
  readonly branchId?: string;
  readonly includeInactive?: boolean;
}

export interface MenuItemPersistenceQuery extends MenuPersistenceQuery {
  readonly itemId: string;
}

export interface ComboPersistenceQuery extends MenuPersistenceQuery {
  readonly comboId: string;
}

export interface MenuSearchPersistenceQuery extends MenuPersistenceQuery {
  readonly text: string;
  readonly categoryId?: string;
  readonly limit?: number;
}

export interface MenuPersistencePort {
  getMenu(query: MenuPersistenceQuery): SdkAsyncResult<MenuRecord>;
  getMenuItem(query: MenuItemPersistenceQuery): SdkAsyncResult<MenuItemRecord>;
  listCategories(query: MenuPersistenceQuery): SdkAsyncResult<readonly CategoryRecord[]>;
  listItems(query: MenuPersistenceQuery): SdkAsyncResult<readonly MenuItemRecord[]>;
  listModifierGroups(query: MenuPersistenceQuery): SdkAsyncResult<readonly ModifierGroupRecord[]>;
  listCombos(query: MenuPersistenceQuery): SdkAsyncResult<readonly ComboRecord[]>;
  search(query: MenuSearchPersistenceQuery): SdkAsyncResult<MenuSearchRecordResult>;
}

export interface CreateMenuRepositoryOptions {
  readonly repository?: MenuRepository;
  readonly persistencePort?: MenuPersistencePort;
  readonly featureFlags?: MenuFeatureFlagReader;
}
