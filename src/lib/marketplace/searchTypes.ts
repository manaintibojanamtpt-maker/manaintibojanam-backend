/**
 * M4 PR-7 — Marketplace search presentation types.
 * View models only — components render these, not SearchResult directly.
 */

import type { SearchPresentationError } from '../search/types';
import type { MarketplaceSearchFilterState, MarketplaceSearchSort } from './searchFilterTypes';

export type MarketplaceSearchStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'location_required'
  | 'location_denied'
  | 'location_unavailable'
  | 'disabled';

export interface MarketplaceSearchMatchBadge {
  readonly id: 'matched_restaurant' | 'matched_cuisine' | 'matched_area' | 'matched_tag' | 'matched';
  readonly label: string;
}

export interface MarketplaceSearchHighlight {
  readonly field: string;
  readonly snippet: string;
}

export interface MarketplaceSearchResultCard {
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly distanceKm: number;
  readonly etaMins?: number;
  readonly rating?: number;
  readonly cuisineLabel?: string;
  readonly thumbnailUrl?: string;
  readonly isOpen: boolean;
  readonly isServiceable: boolean;
  readonly eligibilityLabel: string;
  readonly matchBadges: readonly MarketplaceSearchMatchBadge[];
  readonly highlights: readonly MarketplaceSearchHighlight[];
  readonly storePath: string;
}

export interface MarketplaceSearchViewModel {
  readonly status: MarketplaceSearchStatus;
  readonly query: string;
  readonly locationLabel?: string;
  readonly results: readonly MarketplaceSearchResultCard[];
  readonly totalMatches?: number;
  readonly totalDiscoveryCandidates?: number;
  readonly correlationId?: string;
  readonly recentSearches: readonly string[];
  readonly filters: MarketplaceSearchFilterState;
  readonly sort: MarketplaceSearchSort;
  readonly activeFilterCount: number;
  readonly error?: SearchPresentationError;
  readonly retryable?: boolean;
  readonly searchEnabled: boolean;
}

export interface MarketplaceSearchSuccess {
  readonly ok: true;
  readonly view: MarketplaceSearchViewModel;
}

export interface MarketplaceSearchFailure {
  readonly ok: false;
  readonly view: MarketplaceSearchViewModel;
}

export type MarketplaceSearchOutcome = MarketplaceSearchSuccess | MarketplaceSearchFailure;
