/**
 * SearchSDK — search result and metadata DTOs (M4 foundation).
 */

import type { NearbyRestaurant } from '../../discovery/dto/candidates';
import type { FoodItemHit } from './food';
import type { SearchMatchExplanation, SearchHighlight } from './explanation';
import type { NormalizedSearchQuery } from './query';

export interface SearchTimingMs {
  readonly normalizeMs?: number;
  readonly repositoryMs?: number;
  readonly discoveryMs?: number;
  readonly filterMs?: number;
  readonly rankingMs?: number;
  readonly totalMs?: number;
}

export interface SearchPipelineFlags {
  readonly searchEnabled: boolean;
  readonly discoveryEnabled?: boolean;
  readonly autocompleteEnabled: boolean;
  readonly suggestionsEnabled: boolean;
}

export interface SearchMetadata {
  readonly normalizedText?: string;
  readonly appliedFilters: readonly string[];
  readonly discoveryQueryRadiusKm: number;
  readonly searchSdkVersion: string;
  readonly discoverySdkVersion?: string;
  readonly correlationId?: string;
  readonly discoveryEnrichmentEnabled?: boolean;
  readonly discoveryEnrichmentFallbackReason?: string;
  readonly timingMs?: SearchTimingMs;
  readonly flags: SearchPipelineFlags;
}

export interface SearchRestaurantHit {
  readonly restaurant: NearbyRestaurant;
  readonly match: SearchMatchExplanation;
  readonly highlights?: readonly SearchHighlight[];
  readonly matchedFoodItems?: readonly FoodItemHit[];
}

export interface SearchResult {
  readonly restaurants: readonly SearchRestaurantHit[];
  readonly totalMatches: number;
  readonly totalDiscoveryCandidates: number;
  readonly query: NormalizedSearchQuery;
  readonly metadata: SearchMetadata;
  readonly searchedAt: number;
}
