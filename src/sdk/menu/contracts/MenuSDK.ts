/**
 * MenuSDK — public contract (M7 PR-1).
 *
 * Canonical read/write platform contract for everything sellable.
 * No Firestore, REST, or UI in this contract.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type {
  Combo,
  ComboQuery,
  Menu,
  MenuCategory,
  MenuCategoryQuery,
  MenuItem,
  MenuItemQuery,
  MenuQuery,
  MenuSearchQuery,
  MenuSearchResult,
  MenuValidationInput,
  MenuValidationResult,
  ModifierGroup,
  ModifierGroupQuery,
} from '../dto';
import type { CreateMenuSDKOptions } from '../shared/options';

export interface MenuSDK {
  getMenu(query: MenuQuery): SdkAsyncResult<Menu>;
  getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem>;
  listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]>;
  searchMenu(query: MenuSearchQuery): SdkAsyncResult<MenuSearchResult>;
  getModifierGroups(query: ModifierGroupQuery): SdkAsyncResult<ModifierGroup[]>;
  getCombo(query: ComboQuery): SdkAsyncResult<Combo>;
  validateMenu(input: MenuValidationInput): SdkResult<MenuValidationResult>;
}

export interface MenuSDKFactory {
  create(options?: CreateMenuSDKOptions): MenuSDK;
}
