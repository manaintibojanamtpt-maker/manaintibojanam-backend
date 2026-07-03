/**
 * M4 PR-7 / PR-8 — Marketplace search facade.
 * Presentation → SearchFacade only. No Firestore or SDK direct access from UI.
 */

import { readCustomerLocationSession } from '../customerLocation/CustomerLocationFacade';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import {
  isDiscoveryEnabled,
  isDiscoveryMarketplaceEnabled,
} from '../discovery/discoveryFeatureFlags';
import {
  getSearchSessionSnapshot,
  resetSearchSession,
  subscribeSearchSession,
} from '../search/SearchSession';
import {
  getSearchTelemetrySnapshot,
  resetSearchTelemetry,
} from '../search/SearchTelemetry';
import {
  retrySearch,
  searchRestaurants,
  type SearchFacadeDeps,
} from '../search/SearchFacade';
import { isSearchEnabled } from '../search/searchFeatureFlags';
import { searchInvalidQueryError } from '../search/SearchErrorMapper';
import { buildMarketplaceSearchFacadeQuery } from './buildSearchFacadeQuery';
import { mapSearchResultToCards } from './mapSearchToMarketplace';
import {
  addRecentMarketplaceSearch,
  readRecentMarketplaceSearches,
} from './recentSearchSession';
import { trackSearchAnalytics } from './searchAnalytics';
import {
  DEFAULT_MARKETPLACE_SEARCH_FILTERS,
  DEFAULT_MARKETPLACE_SEARCH_SORT,
  countActiveSearchFilters,
  type MarketplaceSearchFilterState,
  type MarketplaceSearchSort,
} from './searchFilterTypes';
import {
  readMarketplaceSearchPreferences,
  resetMarketplaceSearchPreferences,
  writeMarketplaceSearchPreferences,
} from './searchFilterSession';
import { sortMarketplaceSearchResults } from './sortSearchResults';
import type {
  MarketplaceSearchOutcome,
  MarketplaceSearchStatus,
  MarketplaceSearchViewModel,
} from './searchTypes';

export interface MarketplaceSearchFacadeDeps extends SearchFacadeDeps {
  readonly isSearchEnabled?: () => boolean;
  readonly isDiscoveryEnabled?: () => boolean;
  readonly isMarketplaceEnabled?: () => boolean;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
}

export interface MarketplaceSearchRequest {
  readonly text: string;
  readonly filters?: MarketplaceSearchFilterState;
  readonly sort?: MarketplaceSearchSort;
}

const buildDisabledView = (query: string): MarketplaceSearchViewModel => {
  const preferences = readMarketplaceSearchPreferences();
  return {
    status: 'disabled',
    query,
    results: [],
    recentSearches: readRecentMarketplaceSearches(),
    searchEnabled: false,
    filters: preferences.filters,
    sort: preferences.sort,
    activeFilterCount: countActiveSearchFilters(preferences.filters),
  };
};

export function isMarketplaceSearchEnabled(): boolean {
  return isSearchEnabled() && isDiscoveryEnabled() && isDiscoveryMarketplaceEnabled();
}

export function createMarketplaceSearchFacadeDeps(
  overrides: MarketplaceSearchFacadeDeps = {}
): Required<
  Pick<
    MarketplaceSearchFacadeDeps,
    'isSearchEnabled' | 'isDiscoveryEnabled' | 'isMarketplaceEnabled' | 'readCustomerLocation'
  >
> &
  MarketplaceSearchFacadeDeps {
  return {
    isSearchEnabled: overrides.isSearchEnabled ?? isSearchEnabled,
    isDiscoveryEnabled: overrides.isDiscoveryEnabled ?? isDiscoveryEnabled,
    isMarketplaceEnabled: overrides.isMarketplaceEnabled ?? isDiscoveryMarketplaceEnabled,
    readCustomerLocation: overrides.readCustomerLocation ?? readCustomerLocationSession,
    ...overrides,
  };
}

const mapSearchErrorStatus = (code: string): MarketplaceSearchStatus => {
  if (code === 'FORBIDDEN') {
    return 'location_denied';
  }
  if (code === 'UNAVAILABLE') {
    return 'error';
  }
  return 'error';
};

const resolvePreferences = (request?: Partial<MarketplaceSearchRequest>) => {
  const stored = readMarketplaceSearchPreferences();
  const filters = request?.filters ?? stored.filters;
  const sort = request?.sort ?? stored.sort;
  return { filters, sort };
};

const buildViewModel = (input: {
  readonly status: MarketplaceSearchStatus;
  readonly query: string;
  readonly results?: MarketplaceSearchViewModel['results'];
  readonly filters: MarketplaceSearchFilterState;
  readonly sort: MarketplaceSearchSort;
  readonly locationLabel?: string;
  readonly totalMatches?: number;
  readonly totalDiscoveryCandidates?: number;
  readonly correlationId?: string;
  readonly error?: MarketplaceSearchViewModel['error'];
  readonly retryable?: boolean;
  readonly searchEnabled?: boolean;
}): MarketplaceSearchViewModel => ({
  status: input.status,
  query: input.query,
  locationLabel: input.locationLabel,
  results: input.results ?? [],
  totalMatches: input.totalMatches,
  totalDiscoveryCandidates: input.totalDiscoveryCandidates,
  correlationId: input.correlationId,
  recentSearches: readRecentMarketplaceSearches(),
  filters: input.filters,
  sort: input.sort,
  activeFilterCount: countActiveSearchFilters(input.filters),
  error: input.error,
  retryable: input.retryable,
  searchEnabled: input.searchEnabled ?? isMarketplaceSearchEnabled(),
});

const mapAndSortResults = (
  result: NonNullable<ReturnType<typeof getSearchSessionSnapshot>['lastResult']>,
  sort: MarketplaceSearchSort
) => sortMarketplaceSearchResults(mapSearchResultToCards(result), sort);

const viewFromSession = (submittedQuery: string | null): MarketplaceSearchViewModel => {
  const session = getSearchSessionSnapshot();
  const location = readCustomerLocationSession();
  const query = submittedQuery ?? session.lastQuery?.text ?? '';
  const { filters, sort } = resolvePreferences();
  const telemetry = getSearchTelemetrySnapshot();

  if (!isMarketplaceSearchEnabled()) {
    return buildDisabledView(query);
  }

  const base = {
    query,
    locationLabel: location?.formattedAddress,
    filters,
    sort,
    correlationId: session.telemetryId ?? (telemetry.attemptId || undefined),
    searchEnabled: true,
  };

  if (session.status === 'loading' || session.status === 'retry') {
    return buildViewModel({ ...base, status: 'loading' });
  }

  if (session.status === 'success' && session.lastResult) {
    const results = mapAndSortResults(session.lastResult, sort);
    return buildViewModel({
      ...base,
      status: 'success',
      results,
      totalMatches: session.lastResult.totalMatches,
      totalDiscoveryCandidates: session.lastResult.totalDiscoveryCandidates,
      correlationId: session.lastResult.metadata.correlationId ?? base.correlationId,
    });
  }

  if (session.status === 'empty' && session.lastResult) {
    return buildViewModel({
      ...base,
      status: 'empty',
      totalMatches: 0,
      totalDiscoveryCandidates: session.lastResult.totalDiscoveryCandidates,
      correlationId: session.lastResult.metadata.correlationId ?? base.correlationId,
    });
  }

  if (session.status === 'error' && session.lastError) {
    const status =
      session.lastError.code === 'VALIDATION' && !location
        ? 'location_required'
        : mapSearchErrorStatus(session.lastError.code);

    return buildViewModel({
      ...base,
      status,
      error: session.lastError,
      retryable: session.lastError.retryable,
    });
  }

  if (session.status === 'disabled') {
    return buildViewModel({ ...base, status: 'disabled', searchEnabled: false });
  }

  if (!location && submittedQuery) {
    return buildViewModel({ ...base, status: 'location_required' });
  }

  return buildViewModel({ ...base, status: 'idle' });
};

export function getMarketplaceSearchViewModel(
  submittedQuery: string | null = null
): MarketplaceSearchViewModel {
  return viewFromSession(submittedQuery);
}

export { subscribeSearchSession as subscribeMarketplaceSearch };

export function readMarketplaceSearchFilters(): MarketplaceSearchFilterState {
  return readMarketplaceSearchPreferences().filters;
}

export function readMarketplaceSearchSort(): MarketplaceSearchSort {
  return readMarketplaceSearchPreferences().sort;
}

export async function searchMarketplaceHome(
  request: MarketplaceSearchRequest | string,
  deps: MarketplaceSearchFacadeDeps = {}
): Promise<MarketplaceSearchOutcome> {
  const resolved = createMarketplaceSearchFacadeDeps(deps);
  const normalizedRequest: MarketplaceSearchRequest =
    typeof request === 'string' ? { text: request } : request;
  const trimmed = normalizedRequest.text.trim();
  const { filters, sort } = resolvePreferences(normalizedRequest);

  writeMarketplaceSearchPreferences({ filters, sort });

  if (!resolved.isMarketplaceEnabled() || !resolved.isSearchEnabled() || !resolved.isDiscoveryEnabled()) {
    return { ok: true, view: buildDisabledView(trimmed) };
  }

  if (!trimmed) {
    return {
      ok: false,
      view: buildViewModel({
        status: 'error',
        query: '',
        filters,
        sort,
        error: searchInvalidQueryError('Enter a restaurant, cuisine, or area to search'),
        retryable: false,
      }),
    };
  }

  const location = resolved.readCustomerLocation?.() ?? readCustomerLocationSession();
  if (!location) {
    return {
      ok: true,
      view: buildViewModel({
        status: 'location_required',
        query: trimmed,
        filters,
        sort,
      }),
    };
  }

  trackSearchAnalytics('SEARCH_STARTED', { query: trimmed, filters, sort });

  const outcome = await searchRestaurants(buildMarketplaceSearchFacadeQuery(trimmed, filters), {
    ...deps,
    readCustomerLocation: resolved.readCustomerLocation,
    isEnabled: resolved.isSearchEnabled,
  });

  if (!outcome.ok) {
    const status =
      outcome.error.code === 'VALIDATION' ? 'location_required' : mapSearchErrorStatus(outcome.error.code);

    return {
      ok: false,
      view: buildViewModel({
        status,
        query: trimmed,
        locationLabel: location.formattedAddress,
        filters,
        sort,
        error: outcome.error,
        retryable: outcome.error.retryable,
      }),
    };
  }

  addRecentMarketplaceSearch(trimmed);
  const results = sortMarketplaceSearchResults(mapSearchResultToCards(outcome.result), sort);
  const correlationId = outcome.result.metadata.correlationId;

  if (results.length === 0) {
    trackSearchAnalytics('SEARCH_NO_RESULTS', {
      query: trimmed,
      filters,
      sort,
      correlationId,
      resultCount: 0,
    });
  } else {
    trackSearchAnalytics('SEARCH_COMPLETED', {
      query: trimmed,
      filters,
      sort,
      correlationId,
      resultCount: results.length,
    });
  }

  return {
    ok: true,
    view: buildViewModel({
      status: results.length > 0 ? 'success' : 'empty',
      query: trimmed,
      locationLabel: location.formattedAddress,
      results,
      totalMatches: outcome.result.totalMatches,
      totalDiscoveryCandidates: outcome.result.totalDiscoveryCandidates,
      correlationId,
      filters,
      sort,
    }),
  };
}

export async function applyMarketplaceSearchFilters(
  input: {
    readonly filters: MarketplaceSearchFilterState;
    readonly sort?: MarketplaceSearchSort;
    readonly query?: string;
  },
  deps: MarketplaceSearchFacadeDeps = {}
): Promise<MarketplaceSearchOutcome | null> {
  const sort = input.sort ?? readMarketplaceSearchPreferences().sort;
  writeMarketplaceSearchPreferences({ filters: input.filters, sort });

  trackSearchAnalytics('SEARCH_FILTER_APPLIED', {
    query: input.query,
    filters: input.filters,
    sort,
  });

  const query = input.query?.trim() || getSearchSessionSnapshot().lastQuery?.text?.trim();
  if (!query) {
    return null;
  }

  return searchMarketplaceHome({ text: query, filters: input.filters, sort }, deps);
}

export async function retryMarketplaceSearch(
  deps: MarketplaceSearchFacadeDeps = {}
): Promise<MarketplaceSearchOutcome> {
  const resolved = createMarketplaceSearchFacadeDeps(deps);
  const { filters, sort } = resolvePreferences();
  const query = getSearchSessionSnapshot().lastQuery?.text ?? '';

  if (!resolved.isMarketplaceEnabled() || !resolved.isSearchEnabled() || !resolved.isDiscoveryEnabled()) {
    return { ok: true, view: buildDisabledView(query) };
  }

  trackSearchAnalytics('SEARCH_RETRY', { query, filters, sort });

  const outcome = await retrySearch({
    ...deps,
    readCustomerLocation: resolved.readCustomerLocation,
    isEnabled: resolved.isSearchEnabled,
  });

  const location = resolved.readCustomerLocation();

  if (!outcome.ok) {
    return {
      ok: false,
      view: buildViewModel({
        status: mapSearchErrorStatus(outcome.error.code),
        query,
        locationLabel: location?.formattedAddress,
        filters,
        sort,
        error: outcome.error,
        retryable: outcome.error.retryable,
      }),
    };
  }

  const results = sortMarketplaceSearchResults(mapSearchResultToCards(outcome.result), sort);

  if (results.length === 0) {
    trackSearchAnalytics('SEARCH_NO_RESULTS', {
      query,
      filters,
      sort,
      correlationId: outcome.result.metadata.correlationId,
      resultCount: 0,
    });
  } else {
    trackSearchAnalytics('SEARCH_COMPLETED', {
      query,
      filters,
      sort,
      correlationId: outcome.result.metadata.correlationId,
      resultCount: results.length,
    });
  }

  return {
    ok: true,
    view: buildViewModel({
      status: results.length > 0 ? 'success' : 'empty',
      query,
      locationLabel: location?.formattedAddress,
      results,
      totalMatches: outcome.result.totalMatches,
      totalDiscoveryCandidates: outcome.result.totalDiscoveryCandidates,
      correlationId: outcome.result.metadata.correlationId,
      filters,
      sort,
    }),
  };
}

export function clearMarketplaceSearch(): void {
  const query = getSearchSessionSnapshot().lastQuery?.text;
  const { filters, sort } = readMarketplaceSearchPreferences();

  trackSearchAnalytics('SEARCH_CLEARED', { query, filters, sort });

  resetSearchSession();
  resetSearchTelemetry();
}

export function resetMarketplaceSearchFilters(): void {
  resetMarketplaceSearchPreferences();
}

export function trackMarketplaceSearchResultClick(input: {
  readonly tenantId: string;
  readonly query?: string;
  readonly correlationId?: string;
}): void {
  const { filters, sort } = readMarketplaceSearchPreferences();
  trackSearchAnalytics('SEARCH_RESULT_CLICKED', {
    tenantId: input.tenantId,
    query: input.query,
    correlationId: input.correlationId,
    filters,
    sort,
  });
}

export function getMarketplaceSearchTelemetrySnapshot() {
  return getSearchTelemetrySnapshot();
}
