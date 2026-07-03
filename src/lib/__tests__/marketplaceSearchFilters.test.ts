import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { SearchResult } from '../../sdk/search/dto/results';
import type { TenantId } from '../../sdk/core/types';
import type { BranchId, Geohash } from '../../sdk/discovery/types/branded';
import { createStubSearchAdapter } from '../../sdk/search/adapters/StubSearchAdapter';
import { resetSearchSession } from '../search/SearchSession';
import { resetSearchTelemetry } from '../search/SearchTelemetry';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import { buildMarketplaceSearchFacadeQuery } from '../marketplace/buildSearchFacadeQuery';
import {
  applyMarketplaceSearchFilters,
  clearMarketplaceSearch,
  searchMarketplaceHome,
} from '../marketplace/MarketplaceSearchFacade';
import {
  clearSearchAnalyticsBuffer,
  getSearchAnalyticsBuffer,
  trackSearchAnalytics,
} from '../marketplace/searchAnalytics';
import {
  clearMarketplaceSearchPreferencesForTests,
  readMarketplaceSearchPreferences,
  writeMarketplaceSearchPreferences,
} from '../marketplace/searchFilterSession';
import {
  countActiveSearchFilters,
  DEFAULT_MARKETPLACE_SEARCH_FILTERS,
} from '../marketplace/searchFilterTypes';
import { sortMarketplaceSearchResults } from '../marketplace/sortSearchResults';
import type { MarketplaceSearchResultCard } from '../marketplace/searchTypes';

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

const SEARCH_RESULT: SearchResult = {
  restaurants: [
    {
      restaurant: {
        tenantId: 'tenant-a' as TenantId,
        branchId: 'tenant-a' as BranchId,
        name: 'Alpha Kitchen',
        slug: 'alpha',
        point: { lat: 18.52, lng: 73.85 },
        distanceKm: 3.2,
        geohash: 'tdr1w' as Geohash,
        eligibility: { status: 'serviceable', isServiceable: true, distanceKm: 3.2 },
        eta: { prepTimeMins: 15, deliveryTimeMins: 20, totalMins: 35 },
        rating: 4.1,
        isOpen: true,
      },
      match: {
        score: 0.8,
        rank: 1,
        factors: [
          {
            matchType: 'prefix',
            field: 'name',
            signal: 0.8,
            weight: 1,
            contribution: 0.8,
            label: 'prefix on name',
          },
        ],
      },
    },
    {
      restaurant: {
        tenantId: 'tenant-b' as TenantId,
        branchId: 'tenant-b' as BranchId,
        name: 'Beta Foods',
        slug: 'beta',
        point: { lat: 18.53, lng: 73.86 },
        distanceKm: 1.1,
        geohash: 'tdr1w' as Geohash,
        eligibility: { status: 'serviceable', isServiceable: true, distanceKm: 1.1 },
        eta: { prepTimeMins: 10, deliveryTimeMins: 15, totalMins: 25 },
        rating: 4.8,
        isOpen: true,
      },
      match: {
        score: 0.7,
        rank: 2,
        factors: [
          {
            matchType: 'contains',
            field: 'name',
            signal: 0.7,
            weight: 1,
            contribution: 0.7,
            label: 'contains on name',
          },
        ],
      },
    },
  ],
  totalMatches: 2,
  totalDiscoveryCandidates: 5,
  query: { tokens: ['food'], text: 'food' },
  metadata: {
    appliedFilters: ['restaurantName', 'openNow'],
    discoveryQueryRadiusKm: 5,
    searchSdkVersion: '0.1.0-foundation',
    flags: {
      searchEnabled: true,
      discoveryEnabled: true,
      autocompleteEnabled: false,
      suggestionsEnabled: false,
    },
    correlationId: 'search-analytics-test',
  },
  searchedAt: Date.now(),
};

const baseCard = (overrides: Partial<MarketplaceSearchResultCard>): MarketplaceSearchResultCard => ({
  tenantId: 't1',
  slug: 't1',
  name: 'Test',
  distanceKm: 2,
  isOpen: true,
  isServiceable: true,
  eligibilityLabel: 'Delivers to you',
  matchBadges: [{ id: 'matched', label: 'Matched' }],
  highlights: [],
  storePath: '/k/t1',
  ...overrides,
});

const enabledDeps = {
  isEnabled: () => true,
  isSearchEnabled: () => true,
  isDiscoveryEnabled: () => true,
  isMarketplaceEnabled: () => true,
  readCustomerLocation: () => CUSTOMER_LOCATION,
  sdk: {
    ...createStubSearchAdapter(),
    search: async () => sdkOk(SEARCH_RESULT),
  },
};

describe('buildMarketplaceSearchFacadeQuery (M4 PR-8)', () => {
  it('maps presentation filters to SearchFacade query fields', () => {
    const query = buildMarketplaceSearchFacadeQuery('biryani', {
      openNow: true,
      vegOnly: true,
      maxDistanceKm: 5,
      minRating: 4,
      maxDeliveryMins: 45,
    });

    assert.equal(query.text, 'biryani');
    assert.equal(query.openNow, true);
    assert.equal(query.vegOnly, true);
    assert.equal(query.maxDistanceKm, 5);
    assert.equal(query.minRating, 4);
    assert.equal(query.maxDeliveryMins, 45);
    assert.equal(query.radiusKm, 5);
  });
});

describe('sortMarketplaceSearchResults (M4 PR-8)', () => {
  it('sorts by distance ascending', () => {
    const sorted = sortMarketplaceSearchResults(
      [
        baseCard({ tenantId: 'far', distanceKm: 4.5 }),
        baseCard({ tenantId: 'near', distanceKm: 1.2 }),
      ],
      'distance'
    );
    assert.equal(sorted[0]?.tenantId, 'near');
  });

  it('sorts by rating descending', () => {
    const sorted = sortMarketplaceSearchResults(
      [
        baseCard({ tenantId: 'low', rating: 3.9 }),
        baseCard({ tenantId: 'high', rating: 4.9 }),
      ],
      'rating'
    );
    assert.equal(sorted[0]?.tenantId, 'high');
  });

  it('preserves recommended order', () => {
    const input = [baseCard({ tenantId: 'first' }), baseCard({ tenantId: 'second' })];
    const sorted = sortMarketplaceSearchResults(input, 'recommended');
    assert.deepEqual(sorted.map((card) => card.tenantId), ['first', 'second']);
  });
});

describe('searchFilterSession (M4 PR-8)', () => {
  beforeEach(() => {
    clearMarketplaceSearchPreferencesForTests();
  });

  it('persists filters and sort for the browser session', () => {
    writeMarketplaceSearchPreferences({
      filters: { openNow: true, vegOnly: false, maxDistanceKm: 10, minRating: 4.5 },
      sort: 'distance',
    });

    const stored = readMarketplaceSearchPreferences();
    assert.equal(stored.filters.openNow, true);
    assert.equal(stored.filters.maxDistanceKm, 10);
    assert.equal(stored.sort, 'distance');
  });

  it('counts active filters', () => {
    assert.equal(countActiveSearchFilters(DEFAULT_MARKETPLACE_SEARCH_FILTERS), 0);
    assert.equal(
      countActiveSearchFilters({
        openNow: true,
        vegOnly: true,
        maxDistanceKm: 5,
        minRating: 4,
        maxDeliveryMins: 30,
      }),
      5
    );
  });
});

describe('searchAnalytics (M4 PR-8)', () => {
  beforeEach(() => {
    clearSearchAnalyticsBuffer();
  });

  it('records analytics events in an in-memory buffer', () => {
    trackSearchAnalytics('SEARCH_STARTED', { query: 'biryani' });
    trackSearchAnalytics('SEARCH_COMPLETED', { query: 'biryani', resultCount: 2 });

    const events = getSearchAnalyticsBuffer();
    assert.equal(events.length, 2);
    assert.equal(events[0]?.type, 'SEARCH_STARTED');
    assert.equal(events[1]?.type, 'SEARCH_COMPLETED');
    assert.equal(events[1]?.payload.resultCount, 2);
  });
});

describe('MarketplaceSearchFacade filters (M4 PR-8)', () => {
  beforeEach(() => {
    resetSearchSession();
    resetSearchTelemetry();
    clearMarketplaceSearchPreferencesForTests();
    clearSearchAnalyticsBuffer();
    clearMarketplaceSearch();
  });

  it('applies filter combinations and emits analytics', async () => {
    const outcome = await searchMarketplaceHome(
      {
        text: 'food',
        filters: {
          openNow: true,
          vegOnly: true,
          maxDistanceKm: 5,
          minRating: 4,
          maxDeliveryMins: 40,
        },
        sort: 'rating',
      },
      enabledDeps
    );

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.view.activeFilterCount, 5);
    assert.equal(outcome.view.sort, 'rating');
    assert.equal(outcome.view.results[0]?.tenantId, 'tenant-b');

    const events = getSearchAnalyticsBuffer().map((event) => event.type);
    assert.ok(events.includes('SEARCH_STARTED'));
    assert.ok(events.includes('SEARCH_COMPLETED'));
  });

  it('re-runs search when filters are applied to an active query', async () => {
    await searchMarketplaceHome('food', enabledDeps);

    clearSearchAnalyticsBuffer();
    const outcome = await applyMarketplaceSearchFilters(
      {
        filters: { openNow: true, vegOnly: false, maxDistanceKm: 5 },
        sort: 'distance',
        query: 'food',
      },
      enabledDeps
    );

    assert.ok(outcome);
    if (!outcome) return;
    assert.equal(outcome.view.sort, 'distance');
    assert.equal(outcome.view.results[0]?.tenantId, 'tenant-b');
    assert.ok(getSearchAnalyticsBuffer().some((event) => event.type === 'SEARCH_FILTER_APPLIED'));
  });

  it('emits SEARCH_NO_RESULTS for empty result sets', async () => {
    const outcome = await searchMarketplaceHome('food', {
      ...enabledDeps,
      sdk: {
        ...createStubSearchAdapter(),
        search: async () => sdkOk({ ...SEARCH_RESULT, restaurants: [], totalMatches: 0 }),
      },
    });

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.view.status, 'empty');
    assert.ok(getSearchAnalyticsBuffer().some((event) => event.type === 'SEARCH_NO_RESULTS'));
  });

  it('emits SEARCH_CLEARED when search is reset', async () => {
    await searchMarketplaceHome('food', enabledDeps);
    clearSearchAnalyticsBuffer();
    clearMarketplaceSearch();
    assert.ok(getSearchAnalyticsBuffer().some((event) => event.type === 'SEARCH_CLEARED'));
  });
});
