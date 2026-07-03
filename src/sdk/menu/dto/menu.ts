/**
 * MenuSDK — menu DTOs (M7 PR-1).
 */

import type { MenuId, MenuTimestamp } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { MenuCategory } from './category';
import type { MenuItem } from './item';
import type { MenuMetadata } from './metadata';

export interface Menu {
  readonly menuId: MenuId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly categories: readonly MenuCategory[];
  readonly items: readonly MenuItem[];
  readonly metadata: MenuMetadata;
  readonly version: string;
  readonly updatedAt: MenuTimestamp;
}
