/**
 * Search domain — shared barrel exports (M4 PR-2).
 */

export type { SearchMatchType } from './SearchMatchType';
export { SEARCH_MATCH_TYPE_SIGNALS, isTextMatchType } from './SearchMatchType';

export {
  SEARCH_MIN_QUERY_LENGTH,
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MAX_TOKEN_COUNT,
  SEARCH_MIN_TOKEN_LENGTH,
  SEARCH_STOP_WORDS,
  CUISINE_INFERENCE_PHRASES,
  SEARCH_FIELD_NAMES,
  SEARCH_DOMAIN_VERSION,
} from './SearchConstants';

export {
  stripDiacritics,
  collapseWhitespace,
  toSearchLocale,
  normalizeForMatch,
  normalizeTagToken,
} from './SearchLanguage';

export {
  validateRawSearchQuery,
  validateFacetConstraints,
  hasSearchIntent,
} from './SearchValidation';

export type {
  RawSearchQueryInput,
  NormalizedSearchQuery,
  SearchFacetConstraints,
  SearchFacetTarget,
  TagFilterConstraints,
  TagFilterTarget,
  ClassifiedMatch,
  FilterEvaluationResult,
  SearchValidationIssue,
  SearchValidationResult,
  SearchScoreFactor,
  SearchRankingSignals,
  ComputedSearchScore,
} from './types';
