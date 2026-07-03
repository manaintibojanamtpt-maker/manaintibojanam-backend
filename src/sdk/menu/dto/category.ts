/**
 * MenuSDK — category DTOs (M7 PR-1).
 */

import type { MenuCategoryId } from '../types/branded';

export interface MenuCategory {
  readonly categoryId: MenuCategoryId;
  readonly name: string;
  readonly description?: string;
  readonly sortOrder: number;
  readonly itemIds: readonly string[];
  readonly active: boolean;
}
