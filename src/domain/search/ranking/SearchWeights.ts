/**
 * Search domain — composite ranking weights (M4 PR-2).
 * Domain-owned constants — SDK maps these in adapter layer (PR-6+).
 */

export const SEARCH_DOMAIN_WEIGHTS = {
  exactMatch: 0.3,
  prefixMatch: 0.2,
  containsMatch: 0.1,
  popularity: 0.1,
  distance: 0.15,
  discoveryRank: 0.15,
} as const;

export type SearchDomainWeightKey = keyof typeof SEARCH_DOMAIN_WEIGHTS;

export const ACTIVE_SEARCH_WEIGHT_KEYS: readonly SearchDomainWeightKey[] = [
  'exactMatch',
  'prefixMatch',
  'containsMatch',
  'popularity',
  'distance',
  'discoveryRank',
] as const;

export function sumActiveSearchWeights(
  weights: typeof SEARCH_DOMAIN_WEIGHTS = SEARCH_DOMAIN_WEIGHTS
): number {
  return ACTIVE_SEARCH_WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

export function validateSearchWeights(
  weights: typeof SEARCH_DOMAIN_WEIGHTS = SEARCH_DOMAIN_WEIGHTS
): boolean {
  return Math.abs(sumActiveSearchWeights(weights) - 1) < 0.0001;
}

/** @deprecated Use SEARCH_DOMAIN_WEIGHTS — alias for spec naming */
export const SearchWeights = SEARCH_DOMAIN_WEIGHTS;
