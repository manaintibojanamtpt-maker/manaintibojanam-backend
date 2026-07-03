/**
 * SearchSDK — stub search repository (M4 PR-1 / PR-3).
 */

import type { SdkAsyncResult } from '../../../core/result';
import type { SearchRepository } from '../SearchRepository';
import type {
  AreaSearchFilter,
  AutocompleteFilter,
  CuisineSearchFilter,
  FoodSearchFilter,
  RestaurantSearchFilter,
  SearchIndexHit,
  SearchSuggestion,
  SuggestFilter,
  TagSearchFilter,
} from '../../dto';
import type { FoodItemHit } from '../../dto/food';
import { searchNotConfiguredAsync } from '../../adapters/notConfigured';

const LAYER = 'StubSearchRepository';

export class StubSearchRepository implements SearchRepository {
  searchRestaurants(_filter: RestaurantSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    return searchNotConfiguredAsync('searchRestaurants', LAYER);
  }

  searchCuisine(_filter: CuisineSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    return searchNotConfiguredAsync('searchCuisine', LAYER);
  }

  searchFood(_filter: FoodSearchFilter): SdkAsyncResult<FoodItemHit[]> {
    return searchNotConfiguredAsync('searchFood', LAYER);
  }

  searchArea(_filter: AreaSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    return searchNotConfiguredAsync('searchArea', LAYER);
  }

  searchTags(_filter: TagSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    return searchNotConfiguredAsync('searchTags', LAYER);
  }

  suggest(_filter: SuggestFilter): SdkAsyncResult<SearchSuggestion[]> {
    return searchNotConfiguredAsync('suggest', LAYER);
  }

  autocomplete(_filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]> {
    return searchNotConfiguredAsync('autocomplete', LAYER);
  }
}

export function createStubSearchRepository(): SearchRepository {
  return new StubSearchRepository();
}
