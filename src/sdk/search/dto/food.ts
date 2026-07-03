/**
 * SearchSDK — food item hit DTOs (M4 foundation).
 */

import type { SearchMatchType } from '../types/branded';

export interface FoodItemHit {
  readonly itemId: string;
  readonly name: string;
  readonly category?: string;
  readonly matchType: Exclude<SearchMatchType, 'facet' | 'none'>;
}
