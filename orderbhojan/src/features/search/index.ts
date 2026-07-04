export const M4_MILESTONE = 'M4';

export { SearchProvider } from './ui/SearchProvider';
export { SearchExperience } from './ui/SearchExperience';
export { SearchFiltersBar } from './ui/SearchFiltersBar';
export { SearchBrowsePanel } from './ui/SearchBrowsePanel';
export { useSearchFeatureEnabled } from './hooks/useSearchFeature';
export { useSearchBrowse, useSearchLocationInvalidation } from './hooks/useSearchBrowse';
export { useSearchResults } from './hooks/useSearchResults';
export { useSearchSuggestions } from './hooks/useSearchSuggestions';
export { searchKeys } from './hooks/searchQueryKeys';
export {
  executeSearch,
  loadSearchBrowse,
  loadSearchSuggestions,
  resolveSearchCoords,
  DEFAULT_SEARCH_COORDS,
} from './engine/searchPlatform';
export { useSearchFilterStore, useSearchHistoryStore, useSearchSessionStore } from './store/searchStore';
export {
  trackSearchEvent,
  setSearchAnalyticsSink,
  getSearchAnalyticsSink,
  InMemorySearchAnalytics,
} from './analytics/searchAnalytics';
export type { SearchAnalyticsSink } from './analytics/searchAnalytics';
export { passthroughTypoAdapter, passthroughSynonymAdapter } from './domain/adapters';
