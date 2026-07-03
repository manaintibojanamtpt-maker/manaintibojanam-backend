/**
 * M4 PR-4 — Search presentation facade (ADR-011).
 * Presentation MUST use this module — not SearchSDK, SearchRepository, or Firestore directly.
 */

import { createSearchSDK } from '../../sdk/search/createSearchSDK';
import type { SearchSDK } from '../../sdk/search/contracts/SearchSDK';
import type { Geohash } from '../../sdk/discovery/types/branded';
import type { SearchSuggestion } from '../../sdk/search/dto';
import { isSdkSuccess } from '../../sdk/core/resultHelpers';
import { readCustomerLocationSession } from '../customerLocation/CustomerLocationFacade';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import { readSearchFeatureFlag } from './searchFeatureFlags';
import { readDiscoveryFeatureFlag } from '../discovery/discoveryFeatureFlags';
import { buildSearchContext } from './SearchContext';
import {
  normalizeSearchError,
  searchAutocompleteDisabledError,
  searchFeatureDisabledError,
  searchInvalidQueryError,
  searchSuggestionsDisabledError,
} from './SearchErrorMapper';
import {
  isSearchAutocompleteEnabled,
  isSearchEnabled,
  isSearchSuggestionsEnabled,
} from './searchFeatureFlags';
import {
  beginSearchTelemetry,
  completeSearchTelemetry,
  getSearchTelemetrySnapshot,
  recordSearchContextTiming,
  resetSearchTelemetry,
} from './SearchTelemetry';
import {
  getLastSearchQuery,
  getSearchSessionSnapshot,
  getSearchRetryCount,
  markSearchCancelled,
  markSearchDisabled,
  markSearchEmpty,
  markSearchError,
  markSearchLoading,
  markSearchRetry,
  markSearchSuccess,
  resetSearchSession,
  subscribeSearchSession,
} from './SearchSession';
import type {
  SearchFacadeOutcome,
  SearchFacadeQuery,
  SearchPresentationError,
  SearchSessionSnapshot,
} from './types';

export interface SearchFacadeDeps {
  readonly sdk?: SearchSDK;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
  readonly isEnabled?: () => boolean;
  readonly isAutocompleteEnabled?: () => boolean;
  readonly isSuggestionsEnabled?: () => boolean;
}

const DEFAULT_MAX_RETRIES = 3;

const createAttemptId = (): string => `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function createSearchFacadeDeps(
  overrides: SearchFacadeDeps = {}
): Required<SearchFacadeDeps> {
  return {
    sdk: overrides.sdk ?? createSearchSDK({
      featureFlags: readSearchFeatureFlag,
      discoveryFeatureFlags: readDiscoveryFeatureFlag,
    }),
    readCustomerLocation: overrides.readCustomerLocation ?? readCustomerLocationSession,
    isEnabled: overrides.isEnabled ?? isSearchEnabled,
    isAutocompleteEnabled: overrides.isAutocompleteEnabled,
    isSuggestionsEnabled: overrides.isSuggestionsEnabled,
  };
}

export async function searchRestaurants(
  query: SearchFacadeQuery,
  deps: SearchFacadeDeps = {}
): Promise<SearchFacadeOutcome> {
  const resolved = createSearchFacadeDeps(deps);

  if (!resolved.isEnabled()) {
    markSearchDisabled();
    completeSearchTelemetry('disabled');
    return { ok: false, error: searchFeatureDisabledError() };
  }

  const attemptId = createAttemptId();
  beginSearchTelemetry(attemptId);

  const contextStartedAt = Date.now();
  const customerLocation = resolved.readCustomerLocation();
  const built = buildSearchContext({
    facadeQuery: query,
    customerLocation,
  });
  recordSearchContextTiming(Date.now() - contextStartedAt);

  if (!isSdkSuccess(built)) {
    const error = normalizeSearchError(built.error);
    markSearchError(error);
    completeSearchTelemetry('error');
    return { ok: false, error };
  }

  markSearchLoading(query, built.value.query, attemptId);

  const sdkStartedAt = Date.now();
  const sdkResult = await resolved.sdk.search(built.value.query);
  const sdkMs = Date.now() - sdkStartedAt;

  if (getSearchSessionSnapshot().status === 'cancelled') {
    completeSearchTelemetry('cancelled', sdkMs);
    if (!isSdkSuccess(sdkResult)) {
      return { ok: false, error: normalizeSearchError(sdkResult.error) };
    }
    return { ok: true, result: sdkResult.value };
  }

  if (!isSdkSuccess(sdkResult)) {
    const error = normalizeSearchError(sdkResult.error);
    markSearchError(error);
    completeSearchTelemetry('error', sdkMs);
    return { ok: false, error };
  }

  if (sdkResult.value.restaurants.length === 0) {
    markSearchEmpty(sdkResult.value);
    completeSearchTelemetry('empty', sdkMs);
    return { ok: true, result: sdkResult.value };
  }

  markSearchSuccess(sdkResult.value);
  completeSearchTelemetry('success', sdkMs);
  return { ok: true, result: sdkResult.value };
}

export type SearchSuggestionOutcome =
  | { ok: true; suggestions: SearchSuggestion[] }
  | { ok: false; error: SearchPresentationError };

export async function autocompleteSearch(
  prefix: string,
  deps: SearchFacadeDeps = {}
): Promise<SearchSuggestionOutcome> {
  const resolved = createSearchFacadeDeps(deps);

  if (!(resolved.isAutocompleteEnabled?.() ?? isSearchAutocompleteEnabled())) {
    return { ok: false, error: searchAutocompleteDisabledError() };
  }

  const customerLocation = resolved.readCustomerLocation();
  const customerPoint = customerLocation
    ? { lat: customerLocation.lat, lng: customerLocation.lng }
    : undefined;

  const sdkResult = await resolved.sdk.autocomplete({
    prefix,
    customerPoint,
    limit: 8,
  });

  if (!isSdkSuccess(sdkResult)) {
    return { ok: false, error: normalizeSearchError(sdkResult.error) };
  }

  return { ok: true, suggestions: sdkResult.value };
}

export async function suggestSearch(
  text: string | undefined,
  deps: SearchFacadeDeps = {}
): Promise<SearchSuggestionOutcome> {
  const resolved = createSearchFacadeDeps(deps);

  if (!(resolved.isSuggestionsEnabled?.() ?? isSearchSuggestionsEnabled())) {
    return { ok: false, error: searchSuggestionsDisabledError() };
  }

  const customerLocation = resolved.readCustomerLocation();
  if (!customerLocation) {
    return {
      ok: false,
      error: searchInvalidQueryError('Customer location is required for search suggestions'),
    };
  }

  const sdkResult = await resolved.sdk.suggest({
    text: text?.trim() || undefined,
    customerPoint: { lat: customerLocation.lat, lng: customerLocation.lng },
    customerGeohash: customerLocation.geohash as Geohash | undefined,
    limit: 12,
  });

  if (!isSdkSuccess(sdkResult)) {
    return { ok: false, error: normalizeSearchError(sdkResult.error) };
  }

  return { ok: true, suggestions: sdkResult.value };
}

export async function retrySearch(deps: SearchFacadeDeps = {}): Promise<SearchFacadeOutcome> {
  const lastQuery = getLastSearchQuery();
  if (!lastQuery) {
    const error: SearchPresentationError = searchInvalidQueryError('No prior search query to retry');
    markSearchError(error);
    completeSearchTelemetry('error');
    return { ok: false, error };
  }

  if (getSearchRetryCount() >= DEFAULT_MAX_RETRIES) {
    const error: SearchPresentationError = searchInvalidQueryError(
      'Maximum retry attempts reached. Please try again later.'
    );
    markSearchError(error);
    completeSearchTelemetry('error');
    return { ok: false, error };
  }

  markSearchRetry();
  return searchRestaurants(lastQuery, deps);
}

export function cancelSearch(): void {
  if (sessionIsActive()) {
    markSearchCancelled();
    completeSearchTelemetry('cancelled');
  }
}

const sessionIsActive = (): boolean => {
  const status = getSearchSessionSnapshot().status;
  return status === 'loading' || status === 'retry';
};

export {
  buildSearchContext,
  getSearchSessionSnapshot,
  subscribeSearchSession,
  resetSearchSession,
  getLastSearchQuery,
  getSearchTelemetrySnapshot,
  resetSearchTelemetry,
};

export type {
  SearchFacadeQuery,
  SearchFacadeOutcome,
  SearchPresentationError,
  SearchSessionSnapshot,
};

export {
  isSearchEnabled,
  isSearchRepositoryEnabled,
  isSearchAutocompleteEnabled,
  isSearchSuggestionsEnabled,
} from './searchFeatureFlags';

export { normalizeSearchError, searchFeatureDisabledError } from './SearchErrorMapper';
