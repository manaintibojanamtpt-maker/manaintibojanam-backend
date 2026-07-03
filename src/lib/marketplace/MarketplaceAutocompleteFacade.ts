/**
 * M4 PR-9 — Marketplace autocomplete facade.
 * Presentation → SearchFacade only. No Firestore or SDK direct access from UI.
 */

import { readCustomerLocationSession } from '../customerLocation/CustomerLocationFacade';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import {
  isDiscoveryEnabled,
  isDiscoveryMarketplaceEnabled,
} from '../discovery/discoveryFeatureFlags';
import {
  autocompleteSearch,
  suggestSearch,
  type SearchFacadeDeps,
} from '../search/SearchFacade';
import {
  isSearchAutocompleteEnabled,
  isSearchEnabled,
  isSearchSuggestionsEnabled,
} from '../search/searchFeatureFlags';
import type {
  AutocompleteItem,
  AutocompleteSection,
  MarketplaceAutocompleteViewModel,
} from './autocompleteTypes';
import {
  mapRecentSearchesToItems,
  mapSearchSuggestionsToItems,
} from './mapSuggestionsToAutocomplete';
import { readRecentMarketplaceSearches } from './recentSearchSession';
import {
  STATIC_NEARBY_CUISINES,
  STATIC_POPULAR_CUISINES,
  STATIC_TRENDING_PLACEHOLDER,
  filterStaticCatalog,
} from './suggestionCatalog';
import {
  trackSearchAutocompleteOpened,
  trackSearchAutocompleteSelected,
  trackSearchPopularSelected,
  trackSearchRecentSelected,
  trackSearchSuggestionClicked,
} from './searchAutocompleteAnalytics';

export interface MarketplaceAutocompleteFacadeDeps extends SearchFacadeDeps {
  readonly isSearchEnabled?: () => boolean;
  readonly isDiscoveryEnabled?: () => boolean;
  readonly isMarketplaceEnabled?: () => boolean;
  readonly readCustomerLocation?: () => CustomerCanonicalLocation | null;
  readonly isAutocompleteEnabled?: () => boolean;
  readonly isSuggestionsEnabled?: () => boolean;
}

export interface MarketplaceAutocompleteRequest {
  readonly prefix: string;
  readonly panelOpen: boolean;
}

const EMPTY_VIEW: MarketplaceAutocompleteViewModel = {
  status: 'idle',
  open: false,
  prefix: '',
  sections: [],
  activeIndex: -1,
  autocompleteEnabled: false,
  suggestionsEnabled: false,
};

export function isMarketplaceAutocompleteEnabled(
  deps: MarketplaceAutocompleteFacadeDeps = {}
): boolean {
  const searchOn = deps.isSearchEnabled?.() ?? isSearchEnabled();
  const discoveryOn = deps.isDiscoveryEnabled?.() ?? isDiscoveryEnabled();
  const marketplaceOn = deps.isMarketplaceEnabled?.() ?? isDiscoveryMarketplaceEnabled();

  if (!searchOn || !discoveryOn || !marketplaceOn) {
    return false;
  }

  return (
    (deps.isAutocompleteEnabled?.() ?? isSearchAutocompleteEnabled()) ||
    (deps.isSuggestionsEnabled?.() ?? isSearchSuggestionsEnabled())
  );
}

const buildSection = (
  id: string,
  title: string,
  items: readonly AutocompleteItem[]
): AutocompleteSection | null => {
  if (items.length === 0) {
    return null;
  }

  return { id, title, items };
};

const buildStaticSections = (prefix: string): AutocompleteSection[] => {
  const sections: AutocompleteSection[] = [];

  const popular = buildSection(
    'popular',
    'Popular cuisines',
    filterStaticCatalog(STATIC_POPULAR_CUISINES, prefix)
  );
  const nearby = buildSection(
    'nearby',
    'Nearby cuisines',
    filterStaticCatalog(STATIC_NEARBY_CUISINES, prefix)
  );
  const trending = buildSection('trending', 'Trending restaurants', STATIC_TRENDING_PLACEHOLDER);

  if (popular) sections.push(popular);
  if (nearby) sections.push(nearby);
  if (trending && !prefix.trim()) sections.push(trending);

  return sections;
};

export function buildIdleAutocompleteView(
  deps: MarketplaceAutocompleteFacadeDeps = {}
): MarketplaceAutocompleteViewModel {
  if (!isMarketplaceAutocompleteEnabled(deps)) {
    return EMPTY_VIEW;
  }

  return {
    ...EMPTY_VIEW,
    autocompleteEnabled: deps.isAutocompleteEnabled?.() ?? isSearchAutocompleteEnabled(),
    suggestionsEnabled: deps.isSuggestionsEnabled?.() ?? isSearchSuggestionsEnabled(),
  };
}

export async function loadMarketplaceAutocomplete(
  request: MarketplaceAutocompleteRequest,
  deps: MarketplaceAutocompleteFacadeDeps = {}
): Promise<MarketplaceAutocompleteViewModel> {
  const enabled = isMarketplaceAutocompleteEnabled(deps);
  const autocompleteEnabled =
    deps.isAutocompleteEnabled?.() ?? isSearchAutocompleteEnabled();
  const suggestionsEnabled = deps.isSuggestionsEnabled?.() ?? isSearchSuggestionsEnabled();

  if (!enabled || !request.panelOpen) {
    return buildIdleAutocompleteView(deps);
  }

  const prefix = request.prefix.trim();
  const recentItems = mapRecentSearchesToItems(readRecentMarketplaceSearches());
  const sections: AutocompleteSection[] = [];

  if (!prefix && recentItems.length > 0) {
    const recentSection = buildSection('recent', 'Recent searches', recentItems);
    if (recentSection) {
      sections.push(recentSection);
    }
  }

  const resolvedDeps: MarketplaceAutocompleteFacadeDeps = {
    ...deps,
    readCustomerLocation: deps.readCustomerLocation ?? readCustomerLocationSession,
  };

  const hasLocation = Boolean(resolvedDeps.readCustomerLocation?.());

  if (prefix.length >= 2 && autocompleteEnabled) {
    const autocompleteOutcome = await autocompleteSearch(prefix, resolvedDeps);
    if (autocompleteOutcome.ok === false) {
      const { error } = autocompleteOutcome;
      return {
        status: 'error',
        open: true,
        prefix,
        sections: buildStaticSections(prefix),
        activeIndex: -1,
        error: {
          code: error.code,
          userMessage: error.userMessage,
          retryable: error.retryable,
        },
        autocompleteEnabled,
        suggestionsEnabled,
      };
    }

    const autocompleteItems = mapSearchSuggestionsToItems(autocompleteOutcome.suggestions, 'autocomplete');
    const autocompleteSection = buildSection('autocomplete', 'Suggestions', autocompleteItems);
    if (autocompleteSection) {
      sections.push(autocompleteSection);
    }
  } else if (!prefix && suggestionsEnabled && hasLocation) {
    const suggestOutcome = await suggestSearch(undefined, resolvedDeps);
    if (suggestOutcome.ok) {
      const suggestionItems = mapSearchSuggestionsToItems(suggestOutcome.suggestions, 'suggestion');
      const grouped = groupSuggestionItems(suggestionItems);
      sections.push(...grouped);
    } else if (suggestOutcome.ok === false && !suggestOutcome.error.featureDisabled) {
      const { error } = suggestOutcome;
      return {
        status: 'error',
        open: true,
        prefix,
        sections: buildStaticSections(prefix),
        activeIndex: -1,
        error: {
          code: error.code,
          userMessage: error.userMessage,
          retryable: error.retryable,
        },
        autocompleteEnabled,
        suggestionsEnabled,
      };
    }
  }

  if (!prefix) {
    for (const section of buildStaticSections(prefix)) {
      if (!sections.some((existing) => existing.id === section.id)) {
        sections.push(section);
      }
    }
  } else if (sections.length === 0) {
    sections.push(...buildStaticSections(prefix));
  }

  const flatCount = sections.reduce((count, section) => count + section.items.length, 0);

  return {
    status: flatCount > 0 ? 'ready' : 'empty',
    open: true,
    prefix,
    sections,
    activeIndex: -1,
    autocompleteEnabled,
    suggestionsEnabled,
  };
}

const groupSuggestionItems = (items: readonly AutocompleteItem[]): AutocompleteSection[] => {
  const popular = items.filter((item) => item.source === 'suggestion' && item.kind === 'cuisine');
  const nearby = items.filter((item) => item.source === 'nearby');
  const trending = items.filter((item) => item.source === 'trending');
  const restaurants = items.filter((item) => item.kind === 'restaurant' && item.source !== 'trending');

  const sections: AutocompleteSection[] = [];
  const restaurantSection = buildSection('suggest-restaurants', 'Restaurants', restaurants);
  const popularSection = buildSection('suggest-popular', 'Popular cuisines', popular);
  const nearbySection = buildSection('suggest-nearby', 'Nearby cuisines', nearby);
  const trendingSection = buildSection('suggest-trending', 'Trending restaurants', trending);

  if (restaurantSection) sections.push(restaurantSection);
  if (popularSection) sections.push(popularSection);
  if (nearbySection) sections.push(nearbySection);
  if (trendingSection) sections.push(trendingSection);

  return sections;
};

export function trackAutocompletePanelOpened(prefix: string): void {
  trackSearchAutocompleteOpened({ prefix });
}

export function trackAutocompleteItemSelected(item: AutocompleteItem, prefix: string): void {
  switch (item.source) {
    case 'recent':
      trackSearchRecentSelected({ query: item.label, prefix });
      break;
    case 'popular':
      trackSearchPopularSelected({ label: item.label, prefix });
      break;
    case 'autocomplete':
      trackSearchAutocompleteSelected({ label: item.label, prefix, kind: item.kind });
      break;
    default:
      trackSearchSuggestionClicked({ label: item.label, prefix, source: item.source, kind: item.kind });
      break;
  }
}

export function flattenAutocompleteItems(
  sections: readonly AutocompleteSection[]
): AutocompleteItem[] {
  return sections.flatMap((section) => [...section.items]);
}
