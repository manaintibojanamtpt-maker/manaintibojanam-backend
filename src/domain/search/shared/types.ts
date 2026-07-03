/**
 * Search domain — pure input/output types (M4 PR-2).
 */

import type { SearchMatchType } from './SearchMatchType';

export interface RawSearchQueryInput {
  readonly text?: string;
}

export interface NormalizedSearchQuery {
  readonly text?: string;
  readonly normalizedText: string;
  readonly tokens: readonly string[];
  readonly inferredCuisineTags: readonly string[];
}

export interface SearchFacetConstraints {
  readonly openNow?: boolean;
  readonly vegOnly?: boolean;
  readonly minRating?: number;
  readonly maxDeliveryMins?: number;
  readonly maxDistanceKm?: number;
}

export interface SearchFacetTarget {
  readonly isOpen: boolean;
  readonly hasVegItems?: boolean;
  readonly rating?: number;
  readonly etaMins?: number;
  readonly distanceKm?: number;
}

export interface TagFilterConstraints {
  readonly tags: readonly string[];
  readonly matchMode?: 'any' | 'all';
}

export interface TagFilterTarget {
  readonly tags: readonly string[];
}

export interface ClassifiedMatch {
  readonly matchType: SearchMatchType;
  readonly signal: number;
  readonly field: string;
  readonly label: string;
}

export interface FilterEvaluationResult {
  readonly passed: boolean;
  readonly appliedFacets: readonly string[];
  readonly failedFacet?: string;
  readonly reason?: string;
}

export interface SearchValidationIssue {
  readonly code: string;
  readonly message: string;
}

export interface SearchValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SearchValidationIssue[];
}

export interface SearchScoreFactor {
  readonly factor: string;
  readonly weight: number;
  readonly signal: number;
  readonly contribution: number;
  readonly label: string;
}

export interface SearchRankingSignals {
  readonly exactMatch: number;
  readonly prefixMatch: number;
  readonly containsMatch: number;
  readonly popularity: number;
  readonly distance: number;
  readonly discoveryRank: number;
}

export interface ComputedSearchScore {
  readonly score: number;
  readonly factors: readonly SearchScoreFactor[];
}
