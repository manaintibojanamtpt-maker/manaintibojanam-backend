/**
 * MenuProjectionRepository port (M7 PR-1) — contract only.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { Menu, MenuItem, MenuQuery, MenuItemQuery } from '../dto';

export interface MenuProjectionRepository {
  getProjectedMenu(query: MenuQuery): SdkAsyncResult<Menu>;
  getProjectedMenuItem(query: MenuItemQuery): SdkAsyncResult<MenuItem>;
  isAvailable(): SdkAsyncResult<boolean>;
}
