/**
 * MenuSDK — stub menu repository (M7 PR-3).
 */

import type { SdkAsyncResult } from '../../core/result';
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
import { menuNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'StubMenuRepository';

export class StubMenuRepository implements MenuRepository {
  getMenu(_query: MenuQuery): SdkAsyncResult<Menu> {
    return menuNotConfiguredAsync('getMenu', LAYER);
  }

  getMenuItem(_query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    return menuNotConfiguredAsync('getMenuItem', LAYER);
  }

  listCategories(_query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    return menuNotConfiguredAsync('listCategories', LAYER);
  }

  getCombo(_query: ComboQuery): SdkAsyncResult<Combo> {
    return menuNotConfiguredAsync('getCombo', LAYER);
  }
}

export function createStubMenuRepository(): MenuRepository {
  return new StubMenuRepository();
}
