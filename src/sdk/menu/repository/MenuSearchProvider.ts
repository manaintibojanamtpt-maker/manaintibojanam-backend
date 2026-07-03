/**
 * MenuSearchProvider port (M7 PR-1) — contract only.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { MenuSearchQuery, MenuSearchResult } from '../dto';

export interface MenuSearchProvider {
  searchMenu(query: MenuSearchQuery): SdkAsyncResult<MenuSearchResult>;
}
