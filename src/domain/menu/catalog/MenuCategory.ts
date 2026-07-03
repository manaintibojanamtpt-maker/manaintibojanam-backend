/**
 * Menu domain — category model (M7 PR-2).
 */

export interface MenuCategory {
  readonly categoryId: string;
  readonly name: string;
  readonly description?: string;
  readonly sortOrder: number;
  readonly itemIds: readonly string[];
  readonly active: boolean;
}
