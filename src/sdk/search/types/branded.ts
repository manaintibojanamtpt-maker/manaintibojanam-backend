/**
 * SearchSDK — branded types (M4 foundation).
 */

import type { IsoDateTime } from '../../core/types';

export type SearchSortBy =
  | 'relevance'
  | 'distance'
  | 'rating'
  | 'delivery_time'
  | 'popularity';

export type SearchMatchType = 'exact' | 'prefix' | 'contains' | 'facet' | 'none';

export type SearchSuggestionKind = 'restaurant' | 'cuisine' | 'food' | 'area' | 'tag';

export type SearchProviderKind = 'stub' | 'firestore-scan' | 'index';

export type SearchTimestamp = IsoDateTime;
