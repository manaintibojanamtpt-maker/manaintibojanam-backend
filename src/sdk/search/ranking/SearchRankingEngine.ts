/**
 * SearchSDK — search ranking engine port (M4 foundation).
 * Composite scoring with discovery rank — implementation in M4 PR-6+.
 */

import type { SdkResult } from '../../core/result';
import type { SearchQuery } from '../dto/query';
import type { SearchRestaurantHit } from '../dto/results';

export interface SearchRankingContext {
  readonly query: SearchQuery;
}

export interface SearchRankingEngine {
  rank(
    hits: readonly SearchRestaurantHit[],
    context: SearchRankingContext
  ): SdkResult<readonly SearchRestaurantHit[]>;
}

/** Default weight constants — documented in docs/m4/SEARCH-INTELLIGENCE-PLATFORM.md §6 */
export const SEARCH_RANKING_WEIGHTS = {
  exactMatch: 0.3,
  prefixMatch: 0.2,
  containsMatch: 0.1,
  popularity: 0.1,
  distance: 0.15,
  discoveryRank: 0.15,
} as const;

export type SearchRankingWeightKey = keyof typeof SEARCH_RANKING_WEIGHTS;
