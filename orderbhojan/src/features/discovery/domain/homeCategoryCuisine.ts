import type { HomeCategoryChip } from '@/features/experience/data/mockCatalog';

/** Maps home browse chips to discovery cuisine filter tokens (case-insensitive match). */
export const HOME_CATEGORY_DISCOVERY_CUISINES: Record<HomeCategoryChip['id'], string> = {
  pizza: 'Pizza',
  biryani: 'Biryani',
  meals: 'Meals',
  'south-indian': 'South Indian',
  'north-indian': 'North Indian',
};

export function isHomeCategoryDiscoveryFilterActive(
  chipId: HomeCategoryChip['id'],
  cuisines: readonly string[] | undefined,
): boolean {
  const target = HOME_CATEGORY_DISCOVERY_CUISINES[chipId].toLowerCase();
  return (cuisines ?? []).some((cuisine) => cuisine.toLowerCase() === target);
}

export function toggleHomeCategoryDiscoveryFilter(
  chipId: HomeCategoryChip['id'],
  cuisines: readonly string[] | undefined,
): readonly string[] | undefined {
  if (isHomeCategoryDiscoveryFilterActive(chipId, cuisines)) return undefined;
  return [HOME_CATEGORY_DISCOVERY_CUISINES[chipId]];
}
