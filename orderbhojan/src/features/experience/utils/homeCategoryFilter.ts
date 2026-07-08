import type { FoodCategoryId } from '../domain/experience.types';

export function matchesHomeCategory(
  categoryIds: readonly FoodCategoryId[],
  selectedId: FoodCategoryId | null,
): boolean {
  if (!selectedId) return true;
  return categoryIds.includes(selectedId);
}
