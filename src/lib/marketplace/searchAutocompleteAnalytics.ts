/**
 * M4 PR-9 — marketplace autocomplete analytics (presentation layer).
 */

import { trackSearchAnalytics, type SearchAnalyticsPayload } from './searchAnalytics';

export type SearchAutocompleteAnalyticsEventType =
  | 'SEARCH_AUTOCOMPLETE_OPENED'
  | 'SEARCH_AUTOCOMPLETE_SELECTED'
  | 'SEARCH_SUGGESTION_CLICKED'
  | 'SEARCH_RECENT_SELECTED'
  | 'SEARCH_POPULAR_SELECTED';

export interface SearchAutocompleteAnalyticsPayload extends SearchAnalyticsPayload {
  readonly prefix?: string;
  readonly label?: string;
  readonly source?: string;
  readonly kind?: string;
}

const trackAutocompleteEvent = (
  type: SearchAutocompleteAnalyticsEventType,
  payload: SearchAutocompleteAnalyticsPayload = {}
): void => {
  trackSearchAnalytics(type, payload);
};

export const trackSearchAutocompleteOpened = (
  payload: SearchAutocompleteAnalyticsPayload = {}
): void => {
  trackAutocompleteEvent('SEARCH_AUTOCOMPLETE_OPENED', payload);
};

export const trackSearchAutocompleteSelected = (
  payload: SearchAutocompleteAnalyticsPayload = {}
): void => {
  trackAutocompleteEvent('SEARCH_AUTOCOMPLETE_SELECTED', payload);
};

export const trackSearchSuggestionClicked = (
  payload: SearchAutocompleteAnalyticsPayload = {}
): void => {
  trackAutocompleteEvent('SEARCH_SUGGESTION_CLICKED', payload);
};

export const trackSearchRecentSelected = (
  payload: SearchAutocompleteAnalyticsPayload = {}
): void => {
  trackAutocompleteEvent('SEARCH_RECENT_SELECTED', payload);
};

export const trackSearchPopularSelected = (
  payload: SearchAutocompleteAnalyticsPayload = {}
): void => {
  trackAutocompleteEvent('SEARCH_POPULAR_SELECTED', payload);
};
