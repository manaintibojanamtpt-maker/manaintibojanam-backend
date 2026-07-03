/**
 * MenuSDK — stub adapter (M7 PR-1).
 * All methods return NOT_CONFIGURED until catalog PRs land.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { MenuSDK } from '../contracts/MenuSDK';
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
import { menuNotConfiguredAsync, menuNotConfiguredSync } from './notConfigured';

const LAYER = 'StubMenuAdapter';

export class StubMenuAdapter implements MenuSDK {
  getMenu(_query: MenuQuery): SdkAsyncResult<Menu> {
    return menuNotConfiguredAsync('getMenu', LAYER);
  }

  getMenuItem(_query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    return menuNotConfiguredAsync('getMenuItem', LAYER);
  }

  listCategories(_query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    return menuNotConfiguredAsync('listCategories', LAYER);
  }

  searchMenu(_query: MenuSearchQuery): SdkAsyncResult<MenuSearchResult> {
    return menuNotConfiguredAsync('searchMenu', LAYER);
  }

  getModifierGroups(_query: ModifierGroupQuery): SdkAsyncResult<ModifierGroup[]> {
    return menuNotConfiguredAsync('getModifierGroups', LAYER);
  }

  getCombo(_query: ComboQuery): SdkAsyncResult<Combo> {
    return menuNotConfiguredAsync('getCombo', LAYER);
  }

  validateMenu(_input: MenuValidationInput): SdkResult<MenuValidationResult> {
    return menuNotConfiguredSync('validateMenu', LAYER);
  }
}

export function createStubMenuAdapter(): MenuSDK {
  return new StubMenuAdapter();
}
