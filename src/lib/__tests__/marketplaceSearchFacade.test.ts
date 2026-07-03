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
import {
  deriveSearchMatchBadges,
  mapSearchHitToResultCard,
  mapSearchResultToCards,
} from '../marketplace/mapSearchToMarketplace';
import {
  clearMarketplaceSearch,
  getMarketplaceSearchViewModel,
  isMarketplaceSearchEnabled,
  searchMarketplaceHome,
  retryMarketplaceSearch,
} from '../marketplace/MarketplaceSearchFacade';
import { buildHighlightSegments } from '../marketplace/searchHighlight';
import {
  addRecentMarketplaceSearch,
  clearRecentMarketplaceSearches,
  readRecentMarketplaceSearches,
} from '../marketplace/recentSearchSession';
import { clearMarketplaceSearchPreferencesForTests } from '../marketplace/searchFilterSession';
import { clearSearchAnalyticsBuffer } from '../marketplace/searchAnalytics';

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
        tenantId: 'tenant-spice' as TenantId,
        branchId: 'tenant-spice' as BranchId,
        name: 'Spice Kitchen',
        slug: 'spice-kitchen',
        point: { lat: 18.52, lng: 73.85 },
        distanceKm: 1.3,
        geohash: 'tdr1w' as Geohash,
        eligibility: {
          status: 'serviceable',
          isServiceable: true,
          distanceKm: 1.3,
        },
        eta: { prepTimeMins: 20, deliveryTimeMins: 12, totalMins: 32 },
        rating: 4.5,
        isOpen: true,
      },
      match: {
        score: 0.9,
        rank: 1,
        factors: [
          {
            matchType: 'prefix',
            field: 'name',
            signal: 0.9,
            weight: 1,
            contribution: 0.9,
            label: 'prefix on name',
          },
        ],
      },
      highlights: [{ field: 'name', snippet: 'Spice Kitchen' }],
    },
  ],
  totalMatches: 1,
  totalDiscoveryCandidates: 4,
  query: {
    tokens: ['spice'],
    text: 'spice',
    inferredCuisine: ['biryani'],
  },
  metadata: {
    normalizedText: 'spice',
    appliedFilters: ['restaurantName'],
    discoveryQueryRadiusKm: 10,
    searchSdkVersion: '0.1.0-foundation',
    discoverySdkVersion: '0.6.0-geoindex',
    correlationId: 'search-test-correlation',
    discoveryEnrichmentEnabled: true,
    flags: {
      searchEnabled: true,
      discoveryEnabled: true,
      autocompleteEnabled: false,
      suggestionsEnabled: false,
    },
  },
  searchedAt: Date.now(),
};

const flagsAllOn = (flag: string) => {
  if (flag === 'FF_SEARCH_ENABLED') return true;
  if (flag === 'FF_DISCOVERY_ENABLED') return true;
  if (flag === 'FF_DISCOVERY_MARKETPLACE_ENABLED') return true;
  if (flag === 'FF_SEARCH_REPOSITORY_ENABLED') return true;
  return false;
};

const flagsSearchOff = (flag: string) => flag !== 'FF_SEARCH_ENABLED' && flagsAllOn(flag);

describe('mapSearchToMarketplace (M4 PR-7)', () => {
  it('derives explainable match badges from search factors', () => {
    const card = mapSearchHitToResultCard(SEARCH_RESULT.restaurants[0]!, 'biryani');
    assert.equal(card.matchBadges[0]?.label, 'Matched Restaurant');
    assert.equal(card.eligibilityLabel, 'Delivers to you');
    assert.equal(card.etaMins, 32);
    assert.equal(card.storePath, '/k/spice-kitchen');
  });

  it('maps search result to marketplace cards', () => {
    const cards = mapSearchResultToCards(SEARCH_RESULT);
    assert.equal(cards.length, 1);
    assert.equal(cards[0]?.cuisineLabel, 'biryani');
  });

  it('builds highlight segments for matched query tokens', () => {
    const segments = buildHighlightSegments('Spice Kitchen', 'spice');
    assert.equal(segments.some((segment) => segment.highlight), true);
    assert.ok(segments.find((segment) => segment.text.toLowerCase() === 'spice')?.highlight);
  });

  it('derives cuisine match badge', () => {
    const hit = {
      ...SEARCH_RESULT.restaurants[0]!,
      match: {
        ...SEARCH_RESULT.restaurants[0]!.match,
        factors: [
          {
            matchType: 'contains' as const,
            field: 'cuisineTags',
            signal: 0.8,
            weight: 1,
            contribution: 0.8,
            label: 'contains on cuisineTags',
          },
        ],
      },
    };
    const badges = deriveSearchMatchBadges(hit);
    assert.equal(badges[0]?.label, 'Matched Cuisine');
  });
});

describe('MarketplaceSearchFacade (M4 PR-7)', () => {
  beforeEach(() => {
    resetSearchSession();
    resetSearchTelemetry();
    clearRecentMarketplaceSearches();
    clearMarketplaceSearchPreferencesForTests();
    clearSearchAnalyticsBuffer();
    clearMarketplaceSearch();
  });

  it('reports disabled when feature flags are off', () => {
    assert.equal(
      isMarketplaceSearchEnabled(),
      false
    );
    const view = getMarketplaceSearchViewModel(null);
    assert.equal(view.searchEnabled, false);
    assert.equal(view.status, 'disabled');
  });

  it('searches successfully via SearchFacade with mock SDK', async () => {
    const outcome = await searchMarketplaceHome('spice', {
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: {
        ...createStubSearchAdapter(),
        search: async () => sdkOk(SEARCH_RESULT),
      },
    });

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.view.status, 'success');
    assert.equal(outcome.view.results.length, 1);
    assert.equal(outcome.view.results[0]?.name, 'Spice Kitchen');
    assert.equal(outcome.view.correlationId, 'search-test-correlation');
    assert.ok(readRecentMarketplaceSearches().includes('spice'));
  });

  it('returns location_required when customer location is missing', async () => {
    const outcome = await searchMarketplaceHome('biryani', {
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => null,
    });

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.view.status, 'location_required');
  });

  it('returns empty view for empty query text', async () => {
    const outcome = await searchMarketplaceHome('   ', {
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
    });

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.view.status, 'error');
  });

  it('maps empty search results', async () => {
    const outcome = await searchMarketplaceHome('unknown', {
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: {
        ...createStubSearchAdapter(),
        search: async () =>
          sdkOk({
            ...SEARCH_RESULT,
            restaurants: [],
            totalMatches: 0,
          }),
      },
    });

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.view.status, 'empty');
    assert.equal(outcome.view.results.length, 0);
  });

  it('surfaces discovery/search unavailable as retryable error', async () => {
    const outcome = await searchMarketplaceHome('biryani', {
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: createStubSearchAdapter(),
    });

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.view.status, 'error');
    assert.equal(outcome.view.error?.code, 'NOT_CONFIGURED');
  });

  it('retries last search query', async () => {
    await searchMarketplaceHome('spice', {
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: {
        ...createStubSearchAdapter(),
        search: async () => sdkOk(SEARCH_RESULT),
      },
    });

    const retry = await retryMarketplaceSearch({
      isEnabled: () => true,
      isSearchEnabled: () => true,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
      sdk: {
        ...createStubSearchAdapter(),
        search: async () => sdkOk(SEARCH_RESULT),
      },
    });

    assert.equal(retry.ok, true);
    if (!retry.ok) return;
    assert.equal(retry.view.status, 'success');
  });

  it('clearMarketplaceSearch resets search session while keeping recent searches', () => {
    addRecentMarketplaceSearch('dosa');
    clearMarketplaceSearch();
    const view = getMarketplaceSearchViewModel(null);
    assert.equal(view.status, 'disabled');
    assert.ok(readRecentMarketplaceSearches().includes('dosa'));
  });

  it('respects feature flag overrides in facade deps', async () => {
    const outcome = await searchMarketplaceHome('spice', {
      isSearchEnabled: () => false,
      isDiscoveryEnabled: () => true,
      isMarketplaceEnabled: () => true,
      readCustomerLocation: () => CUSTOMER_LOCATION,
    });

    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.view.status, 'disabled');
    assert.equal(outcome.view.searchEnabled, false);
  });
});
