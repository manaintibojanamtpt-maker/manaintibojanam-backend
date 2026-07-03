/**
 * M4 PR-8 — marketplace search filter & sort session persistence.
 */

import {
  DEFAULT_MARKETPLACE_SEARCH_FILTERS,
  DEFAULT_MARKETPLACE_SEARCH_SORT,
  type MarketplaceSearchFilterState,
  type MarketplaceSearchSort,
} from './searchFilterTypes';

const STORAGE_KEY = 'bhos_marketplace_search_filters';

interface PersistedSearchPreferences {
  readonly filters: MarketplaceSearchFilterState;
  readonly sort: MarketplaceSearchSort;
}

let memoryPreferences: PersistedSearchPreferences = {
  filters: DEFAULT_MARKETPLACE_SEARCH_FILTERS,
  sort: DEFAULT_MARKETPLACE_SEARCH_SORT,
};

const readStorage = (): PersistedSearchPreferences => {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PersistedSearchPreferences;
        if (parsed && typeof parsed === 'object') {
          return {
            filters: {
              openNow: Boolean(parsed.filters?.openNow),
              vegOnly: Boolean(parsed.filters?.vegOnly),
              maxDistanceKm:
                typeof parsed.filters?.maxDistanceKm === 'number'
                  ? parsed.filters.maxDistanceKm
                  : undefined,
              minRating:
                typeof parsed.filters?.minRating === 'number' ? parsed.filters.minRating : undefined,
              maxDeliveryMins:
                typeof parsed.filters?.maxDeliveryMins === 'number'
                  ? parsed.filters.maxDeliveryMins
                  : undefined,
            },
            sort: parsed.sort === 'distance' || parsed.sort === 'rating' ? parsed.sort : 'recommended',
          };
        }
      }
    } catch {
      return memoryPreferences;
    }
  }

  return memoryPreferences;
};

const writeStorage = (preferences: PersistedSearchPreferences): void => {
  memoryPreferences = preferences;

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // ignore
  }
};

export function readMarketplaceSearchPreferences(): PersistedSearchPreferences {
  return readStorage();
}

export function writeMarketplaceSearchPreferences(input: {
  readonly filters: MarketplaceSearchFilterState;
  readonly sort: MarketplaceSearchSort;
}): void {
  writeStorage(input);
}

export function resetMarketplaceSearchPreferences(): void {
  writeStorage({
    filters: DEFAULT_MARKETPLACE_SEARCH_FILTERS,
    sort: DEFAULT_MARKETPLACE_SEARCH_SORT,
  });
}

export function clearMarketplaceSearchPreferencesForTests(): void {
  resetMarketplaceSearchPreferences();
}
