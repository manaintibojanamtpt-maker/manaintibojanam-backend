/**
 * SearchSDK — type barrel exports.
 */

export type {
  SearchSortBy,
  SearchMatchType,
  SearchSuggestionKind,
  SearchProviderKind,
  SearchTimestamp,
} from './branded';

export type { SearchSDK, SearchSDKFactory } from '../contracts/SearchSDK';
export type { SearchRepository } from '../repository/SearchRepository';
export type {
  SearchRankingEngine,
  SearchRankingContext,
  SearchRankingWeightKey,
} from '../ranking/SearchRankingEngine';
export type { SearchFilterStage, SearchFilteredHit } from '../filters/SearchFilters';

export type {
  SearchQuery,
  NormalizedSearchQuery,
  SearchFilter,
  CuisineFilter,
  AreaFilter,
  TagFilter,
  SortOption,
  SearchResult,
  SearchRestaurantHit,
  SearchMetadata,
  SearchTimingMs,
  SearchPipelineFlags,
  SearchSuggestion,
  AutocompleteFilter,
  SuggestFilter,
  SearchExplanation,
  SearchMatchExplanation,
  SearchHighlight,
  FoodItemHit,
  SearchIndexHit,
  RestaurantSearchFilter,
  CuisineSearchFilter,
  FoodSearchFilter,
  AreaSearchFilter,
  TagSearchFilter,
  SearchSessionSnapshot,
  SearchSessionStatus,
} from '../dto';

export { SEARCH_RANKING_WEIGHTS } from '../ranking/SearchRankingEngine';

export type { SearchSdkFeatureFlag } from '../core/featureFlags';
export {
  SEARCH_SDK_FEATURE_FLAG_DEFAULTS,
  SEARCH_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../core/featureFlags';

export {
  SEARCH_SDK_VERSION,
  SEARCH_SDK_FROZEN,
  SEARCH_SDK_MODULE,
} from '../version';
