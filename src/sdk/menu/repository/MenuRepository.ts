/**
 * MenuRepository port (M7 PR-1) — contract only.
 */

import type { SdkAsyncResult } from '../../core/result';
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

export interface MenuRepository {
  getMenu(query: MenuQuery): SdkAsyncResult<Menu>;
  getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem>;
  listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]>;
  getCombo(query: ComboQuery): SdkAsyncResult<Combo>;
}
