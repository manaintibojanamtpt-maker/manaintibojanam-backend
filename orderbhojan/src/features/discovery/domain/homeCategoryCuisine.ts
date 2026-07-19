import type { HomeCategoryChip } from '@/features/experience/data/mockCatalog';

/** Primary discovery cuisine label for each home browse chip. */
export const HOME_CATEGORY_DISCOVERY_CUISINES: Record<HomeCategoryChip['id'], string> = {
  pizza: 'Pizza',
  biryani: 'Biryani',
  meals: 'Meals',
  'south-indian': 'South Indian',
  'north-indian': 'North Indian',
};

/** Owner-menu aligned aliases — matched case-insensitively against restaurant cuisine tags. */
export const HOME_CATEGORY_CUISINE_ALIASES: Record<HomeCategoryChip['id'], readonly string[]> = {
  pizza: ['pizza', 'italian'],
  biryani: ['biryani', 'hyderabadi', 'dum', 'pulao'],
  meals: ['meals', 'thali', 'meal', 'combo', 'platter'],
  'south-indian': ['south indian', 'dosa', 'idli', 'vada', 'uttapam', 'andhra', 'tamil', 'kerala', 'chettinad'],
  'north-indian': ['north indian', 'punjabi', 'mughlai', 'tandoor', 'roti', 'naan', 'paratha', 'curry'],
};

const CHIP_BY_PRIMARY_LABEL = new Map<string, HomeCategoryChip['id']>(
  (Object.entries(HOME_CATEGORY_DISCOVERY_CUISINES) as [HomeCategoryChip['id'], string][]).map(
    ([chipId, label]) => [label.toLowerCase(), chipId],
  ),
);

function normalizeCuisine(value: string): string {
  return value.trim().toLowerCase();
}

function cuisineTokensMatch(restaurantCuisine: string, filterToken: string): boolean {
  const cuisine = normalizeCuisine(restaurantCuisine);
  const token = normalizeCuisine(filterToken);
  if (!cuisine || !token) return false;
  return cuisine === token || cuisine.includes(token) || token.includes(cuisine);
}

export function resolveHomeCategoryCuisineMatchTokens(chipId: HomeCategoryChip['id']): readonly string[] {
  return [HOME_CATEGORY_DISCOVERY_CUISINES[chipId], ...HOME_CATEGORY_CUISINE_ALIASES[chipId]];
}

export function resolveDiscoveryCuisineMatchTokens(filterCuisine: string): readonly string[] {
  const chipId = CHIP_BY_PRIMARY_LABEL.get(normalizeCuisine(filterCuisine));
  if (chipId) return resolveHomeCategoryCuisineMatchTokens(chipId);
  return [filterCuisine];
}

export function restaurantMatchesDiscoveryCuisineFilter(
  restaurantCuisines: readonly string[],
  filterCuisines: readonly string[],
): boolean {
  if (!filterCuisines.length) return true;
  return filterCuisines.some((filterCuisine) => {
    const tokens = resolveDiscoveryCuisineMatchTokens(filterCuisine);
    return tokens.some((token) =>
      restaurantCuisines.some((cuisine) => cuisineTokensMatch(cuisine, token)),
    );
  });
}

export function isHomeCategoryDiscoveryFilterActive(
  chipId: HomeCategoryChip['id'],
  cuisines: readonly string[] | undefined,
): boolean {
  const active = cuisines ?? [];
  if (active.length === 0) return false;
  const primary = normalizeCuisine(HOME_CATEGORY_DISCOVERY_CUISINES[chipId]);
  return active.some((cuisine) => normalizeCuisine(cuisine) === primary);
}

export function toggleHomeCategoryDiscoveryFilter(
  chipId: HomeCategoryChip['id'],
  cuisines: readonly string[] | undefined,
): readonly string[] | undefined {
  if (isHomeCategoryDiscoveryFilterActive(chipId, cuisines)) return undefined;
  return [HOME_CATEGORY_DISCOVERY_CUISINES[chipId]];
}

/** Search query routed when a browse chip is tapped (matches owner menu dish naming). */
export function resolveHomeCategorySearchQuery(chipId: HomeCategoryChip['id']): string {
  return HOME_CATEGORY_DISCOVERY_CUISINES[chipId].toLowerCase();
}
