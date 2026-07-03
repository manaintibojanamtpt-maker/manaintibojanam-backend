/**
 * Legacy menu read adapter (M7 PR-11).
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
import type { LegacyMenuReadPort } from './menuAdapterPorts';

export class LegacyMenuAdapter {
  constructor(private readonly repository: LegacyMenuReadPort) {}

  getMenu(query: MenuQuery): SdkAsyncResult<Menu> {
    return this.repository.getMenu(query);
  }

  getMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem> {
    return this.repository.getMenuItem(query);
  }

  listCategories(query: MenuCategoryQuery): SdkAsyncResult<MenuCategory[]> {
    return this.repository.listCategories(query);
  }

  getCombo(query: ComboQuery): SdkAsyncResult<Combo> {
    return this.repository.getCombo(query);
  }
}

export function createLegacyMenuAdapter(repository: LegacyMenuReadPort): LegacyMenuAdapter {
  return new LegacyMenuAdapter(repository);
}
