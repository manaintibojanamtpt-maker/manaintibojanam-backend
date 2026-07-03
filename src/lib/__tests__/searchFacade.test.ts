import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { SearchSDK } from '../../sdk/search/contracts/SearchSDK';
import { createStubSearchAdapter } from '../../sdk/search/adapters/StubSearchAdapter';
import { buildSearchContext } from '../search/SearchContext';
import {
  cancelSearch,
  normalizeSearchError,
  retrySearch,
  searchFeatureDisabledError,
  searchRestaurants,
} from '../search/SearchFacade';
import {
  getSearchSessionSnapshot,
  resetSearchSession,
  subscribeSearchSession,
} from '../search/SearchSession';
import {
  getSearchTelemetrySnapshot,
  resetSearchTelemetry,
} from '../search/SearchTelemetry';
import type { CustomerCanonicalLocation } from '../customerLocation/types';

const CUSTOMER_LOCATION: CustomerCanonicalLocation = {
  country: 'IN',
  lat: 18.5204,
  lng: 73.8567,
  accuracyM: 12,
  geohash: 'tdr1w',
  formattedAddress: 'Pune, Maharashtra',
  coordinateSource: 'gps',
  detectedAt: Date.now(),
};

const EMPTY_SEARCH_RESULT = {
  restaurants: [],
  totalMatches: 0,
  totalDiscoveryCandidates: 0,
  query: {
    tokens: ['biryani'],
    normalizedText: 'biryani',
    inferredCuisineTags: ['biryani'],
  },
  metadata: {
    normalizedText: 'biryani',
    appliedFilters: [],
    discoveryQueryRadiusKm: 10,
    searchSdkVersion: '0.1.0-foundation',
    flags: {
      searchEnabled: true,
      autocompleteEnabled: false,
      suggestionsEnabled: false,
    },
  },
  searchedAt: Date.now(),
};

const createMockSdk = (overrides: Partial<SearchSDK> = {}): SearchSDK => {
  const stub = createStubSearchAdapter();
  return { ...stub, ...overrides };
};

describe('SearchFacade (M4 PR-4)', () => {
  beforeEach(() => {
    resetSearchSession();
    resetSearchTelemetry();
  });

  it('returns feature-disabled outcome when FF_SEARCH_ENABLED is off', async () => {
    const outcome = await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => false,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.featureDisabled, true);
    assert.equal(getSearchSessionSnapshot().status, 'disabled');
  });

  it('rejects empty query without filters', async () => {
    const outcome = await searchRestaurants(
      {},
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk(),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
  });

  it('buildSearchContext requires customer location when no override', () => {
    const result = buildSearchContext({
      facadeQuery: { text: 'biryani' },
      customerLocation: null,
    });
    assert.equal(result.ok, false);
  });

  it('buildSearchContext maps customer session to SearchQuery', () => {
    const result = buildSearchContext({
      facadeQuery: { text: 'biryani', radiusKm: 8, limit: 10 },
      customerLocation: CUSTOMER_LOCATION,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.query.customerPoint.lat, 18.5204);
    assert.equal(result.value.query.radiusKm, 8);
    assert.equal(result.value.meta.usedCustomerSession, true);
  });

  it('invokes SearchSDK and stores empty session when no restaurants returned', async () => {
    const outcome = await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({
          search: async () => sdkOk(EMPTY_SEARCH_RESULT),
        }),
      }
    );

    assert.equal(outcome.ok, true);
    assert.equal(getSearchSessionSnapshot().status, 'empty');
    assert.equal(getSearchTelemetrySnapshot().status, 'empty');
    assert.ok((getSearchTelemetrySnapshot().sdkMs ?? 0) >= 0);
  });

  it('stores success when restaurants are returned', async () => {
    const outcome = await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({
          search: async () =>
            sdkOk({
              ...EMPTY_SEARCH_RESULT,
              restaurants: [
                {
                  restaurant: {
                    tenantId: 't1' as never,
                    branchId: 't1' as never,
                    name: 'Spice Kitchen',
                    slug: 'spice-kitchen',
                    point: { lat: 18.52, lng: 73.85 },
                    distanceKm: 2,
                    geohash: 'tdr1w' as never,
                    eligibility: {
                      status: 'serviceable',
                      isServiceable: true,
                      distanceKm: 2,
                    },
                    isOpen: true,
                  },
                  match: {
                    score: 0.9,
                    rank: 1,
                    factors: [],
                  },
                },
              ],
              totalMatches: 1,
            }),
        }),
      }
    );

    assert.equal(outcome.ok, true);
    assert.equal(getSearchSessionSnapshot().status, 'success');
  });

  it('normalizes NOT_CONFIGURED SDK errors for presentation', async () => {
    const outcome = await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createStubSearchAdapter(),
      }
    );

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
    assert.match(outcome.error.userMessage, /not available/i);
    assert.equal(getSearchSessionSnapshot().status, 'error');
  });

  it('normalizeSearchError marks UNAVAILABLE as retryable', () => {
    const normalized = normalizeSearchError({
      code: 'UNAVAILABLE',
      message: 'timeout',
      details: { retryable: true },
    });
    assert.equal(normalized.retryable, true);
  });

  it('retrySearch re-runs last query and increments retry count on failure', async () => {
    const retryableFail = async () => ({
      ok: false as const,
      error: {
        code: 'UNAVAILABLE' as const,
        message: 'temporary',
        details: { retryable: true },
      },
    });

    await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({ search: retryableFail }),
      }
    );

    assert.equal(getSearchSessionSnapshot().retryCount, 1);

    const retry = await retrySearch({
      isEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: createMockSdk({ search: retryableFail }),
    });

    assert.equal(retry.ok, false);
    assert.equal(getSearchSessionSnapshot().retryCount, 2);
  });

  it('subscribeSearchSession notifies listeners on state changes', async () => {
    const statuses: string[] = [];
    const unsubscribe = subscribeSearchSession((snapshot) => {
      statuses.push(snapshot.status);
    });

    await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({ search: async () => sdkOk(EMPTY_SEARCH_RESULT) }),
      }
    );

    unsubscribe();
    assert.ok(statuses.includes('loading'));
    assert.ok(statuses.includes('empty'));
  });

  it('resetSearchSession returns session to idle', async () => {
    await searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({ search: async () => sdkOk(EMPTY_SEARCH_RESULT) }),
      }
    );

    resetSearchSession();
    assert.equal(getSearchSessionSnapshot().status, 'idle');
  });

  it('cancelSearch marks cancelled during active loading', async () => {
    let resolveSearch: ((value: ReturnType<typeof sdkOk>) => void) | undefined;
    const pendingSearch = new Promise<ReturnType<typeof sdkOk>>((resolve) => {
      resolveSearch = resolve;
    });

    const pending = searchRestaurants(
      { text: 'biryani' },
      {
        isEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: createMockSdk({
          search: async () => pendingSearch,
        }),
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    cancelSearch();
    resolveSearch?.(sdkOk(EMPTY_SEARCH_RESULT));
    await pending;

    assert.equal(getSearchSessionSnapshot().status, 'cancelled');
  });

  it('searchFeatureDisabledError is not retryable', () => {
    const error = searchFeatureDisabledError();
    assert.equal(error.retryable, false);
    assert.equal(error.featureDisabled, true);
  });
});
