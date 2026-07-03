import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { SearchSuggestion } from '../../sdk/search/dto';
import { createStubSearchAdapter } from '../../sdk/search/adapters/StubSearchAdapter';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import {
  autocompleteSearch,
  suggestSearch,
} from '../search/SearchFacade';
import {
  buildIdleAutocompleteView,
  flattenAutocompleteItems,
  isMarketplaceAutocompleteEnabled,
  loadMarketplaceAutocomplete,
  trackAutocompleteItemSelected,
} from '../marketplace/MarketplaceAutocompleteFacade';
import { mapRecentSearchesToItems } from '../marketplace/mapSuggestionsToAutocomplete';
import {
  addRecentMarketplaceSearch,
  clearRecentMarketplaceSearches,
} from '../marketplace/recentSearchSession';
import { clearSearchAnalyticsBuffer, getSearchAnalyticsBuffer } from '../marketplace/searchAnalytics';

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

const AUTOCOMPLETE_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 'restaurant-tenant-spice',
    label: 'Spice Kitchen',
    kind: 'restaurant',
    score: 0.9,
  },
];

const createFlagReader =
  (overrides: Record<string, boolean> = {}) =>
  (flag: string): boolean => {
    if (flag in overrides) {
      return overrides[flag]!;
    }
    return false;
  };

describe('Marketplace autocomplete facade (M4 PR-9)', () => {
  beforeEach(() => {
    clearRecentMarketplaceSearches();
    clearSearchAnalyticsBuffer();
  });

  it('isMarketplaceAutocompleteEnabled requires search + discovery + suggestion flags', () => {
    assert.equal(
      isMarketplaceAutocompleteEnabled({
        isSearchEnabled: () => true,
        isDiscoveryEnabled: () => true,
        isMarketplaceEnabled: () => true,
      }),
      false
    );

    assert.equal(
      isMarketplaceAutocompleteEnabled({
        isSearchEnabled: () => true,
        isDiscoveryEnabled: () => true,
        isMarketplaceEnabled: () => true,
        isAutocompleteEnabled: () => true,
      }),
      true
    );
  });

  it('autocompleteSearch returns NOT_CONFIGURED when autocomplete flag is off', async () => {
    const outcome = await autocompleteSearch('spi', {
      sdk: createStubSearchAdapter(),
      readCustomerLocation: () => CUSTOMER_LOCATION,
      isEnabled: () => true,
      isAutocompleteEnabled: () => false,
    });

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'NOT_CONFIGURED');
  });

  it('loadMarketplaceAutocomplete merges recent searches and static catalog', async () => {
    addRecentMarketplaceSearch('biryani');

    const view = await loadMarketplaceAutocomplete(
      { prefix: '', panelOpen: true },
      {
        isSearchEnabled: () => true,
        isDiscoveryEnabled: () => true,
        isMarketplaceEnabled: () => true,
        isSuggestionsEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: {
          ...createStubSearchAdapter(),
          suggest: async () => sdkOk([]),
        },
      }
    );

    assert.equal(view.open, true);
    assert.ok(view.sections.some((section) => section.id === 'recent'));
    assert.ok(view.sections.some((section) => section.id === 'popular'));
  });

  it('loadMarketplaceAutocomplete calls SDK autocomplete for prefix', async () => {
    let autocompleteCalled = false;

    const view = await loadMarketplaceAutocomplete(
      { prefix: 'spi', panelOpen: true },
      {
        isSearchEnabled: () => true,
        isDiscoveryEnabled: () => true,
        isMarketplaceEnabled: () => true,
        isAutocompleteEnabled: () => true,
        readCustomerLocation: () => CUSTOMER_LOCATION,
        sdk: {
          ...createStubSearchAdapter(),
          autocomplete: async () => {
            autocompleteCalled = true;
            return sdkOk(AUTOCOMPLETE_SUGGESTIONS);
          },
        },
      }
    );

    assert.equal(autocompleteCalled, true);
    assert.equal(view.status, 'ready');
    assert.ok(
      flattenAutocompleteItems(view.sections).some((item) => item.label === 'Spice Kitchen')
    );
  });

  it('trackAutocompleteItemSelected records analytics events', () => {
    trackAutocompleteItemSelected(
      { id: 'recent-biryani', label: 'biryani', source: 'recent', kind: 'tag' },
      ''
    );

    const events = getSearchAnalyticsBuffer();
    assert.ok(events.some((event) => event.type === 'SEARCH_RECENT_SELECTED'));
  });

  it('mapRecentSearchesToItems preserves query labels', () => {
    const items = mapRecentSearchesToItems(['Paneer', 'Biryani']);
    assert.equal(items.length, 2);
    assert.equal(items[0]?.source, 'recent');
  });

  it('buildIdleAutocompleteView is closed by default', () => {
    const view = buildIdleAutocompleteView();
    assert.equal(view.open, false);
    assert.equal(view.sections.length, 0);
  });

  it('suggestSearch requires customer location', async () => {
    const readSearchFlag = createFlagReader({
      FF_SEARCH_ENABLED: true,
      FF_SEARCH_SUGGESTIONS_ENABLED: true,
    });

    const outcome = await suggestSearch(undefined, {
      sdk: createStubSearchAdapter(),
      readCustomerLocation: () => null,
      isEnabled: () => true,
      isSuggestionsEnabled: () => true,
    });

    assert.equal(outcome.ok, false);
    if (outcome.ok) return;
    assert.equal(outcome.error.code, 'VALIDATION');
  });
});
