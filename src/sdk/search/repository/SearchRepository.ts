/**
 * SearchSDK — read-only search repository port (M4 foundation).
 * No Firestore types in this contract.
 *
 * Implementations arrive in M4 PR-3+ — not in foundation PR.
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  AreaSearchFilter,
  CuisineSearchFilter,
  FoodSearchFilter,
  RestaurantSearchFilter,
  SearchIndexHit,
  TagSearchFilter,
  AutocompleteFilter,
  SuggestFilter,
  SearchSuggestion,
} from '../dto';
import type { FoodItemHit } from '../dto/food';

export interface SearchRepository {
  searchRestaurants(filter: RestaurantSearchFilter): SdkAsyncResult<SearchIndexHit[]>;

  searchCuisine(filter: CuisineSearchFilter): SdkAsyncResult<SearchIndexHit[]>;

  searchFood(filter: FoodSearchFilter): SdkAsyncResult<FoodItemHit[]>;

  searchArea(filter: AreaSearchFilter): SdkAsyncResult<SearchIndexHit[]>;

  searchTags(filter: TagSearchFilter): SdkAsyncResult<SearchIndexHit[]>;

  suggest(filter: SuggestFilter): SdkAsyncResult<SearchSuggestion[]>;

  autocomplete(filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]>;
}
