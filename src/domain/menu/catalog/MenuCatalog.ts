/**
 * Menu domain — catalog model (M7 PR-2).
 */

import type { MenuCategory } from './MenuCategory';
import type { MenuItem } from './MenuItem';

export interface MenuCatalog {
  readonly catalogId: string;
  readonly tenantId: string;
  readonly name: string;
  readonly categories: readonly MenuCategory[];
  readonly items: readonly MenuItem[];
  readonly version: string;
}
