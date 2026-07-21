export const M4_MILESTONE = 'M4';

export { SearchProvider } from './ui/SearchProvider';
export { OrderBhojanSearchExperience as SearchExperience } from '@/presentation/search';
export { OrderBhojanSearchFiltersBar as SearchFiltersBar } from '@/presentation/search';
export { OrderBhojanSearchBrowsePanel as SearchBrowsePanel } from '@/presentation/search';
export { useSearchFeatureEnabled } from './hooks/useSearchFeature';
export { useSearchBrowse, useSearchLocationInvalidation } from './hooks/useSearchBrowse';
export { useSearchResults } from './hooks/useSearchResults';
export { useMenuItemSearch } from './hooks/useMenuItemSearch';
export { useMenuItemSearchSuggestions } from './hooks/useMenuItemSearchSuggestions';
export { useSearchSuggestions } from './hooks/useSearchSuggestions';
export { searchKeys } from './hooks/searchQueryKeys';
export {
  executeSearch,
  executeMenuItemSearch,
  loadSearchBrowse,
  loadSearchSuggestions,
  resolveSearchCoords,
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
