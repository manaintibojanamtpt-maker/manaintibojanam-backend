/**
 * SearchSDK — DTO barrel exports.
 */

export type { SearchQuery, NormalizedSearchQuery } from './query';
export type {
  SearchFilter,
  CuisineFilter,
  AreaFilter,
  TagFilter,
} from './filters';
export type { SortOption } from './sort';
export type {
  SearchResult,
  SearchRestaurantHit,
  SearchMetadata,
  SearchTimingMs,
  SearchPipelineFlags,
} from './results';
export type {
  SearchSuggestion,
  SuggestFilter,
  AutocompleteFilter,
} from './suggestions';
export type {
  SearchExplanation,
  SearchMatchExplanation,
  SearchHighlight,
} from './explanation';
export type { FoodItemHit } from './food';
export type {
  SearchIndexHit,
  RestaurantSearchFilter,
  CuisineSearchFilter,
  FoodSearchFilter,
  AreaSearchFilter,
  TagSearchFilter,
} from './repository';
export type {
  SearchSessionSnapshot,
  SearchSessionStatus,
  SearchPresentationError,
} from './session';
export { EMPTY_SEARCH_SESSION } from './session';
