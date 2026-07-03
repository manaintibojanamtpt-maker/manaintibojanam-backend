/**
 * Search domain — validation rules (M4 PR-2).
 */

import {
  SEARCH_MAX_QUERY_LENGTH,
  SEARCH_MIN_QUERY_LENGTH,
} from './SearchConstants';
import type {
  RawSearchQueryInput,
  SearchFacetConstraints,
  SearchValidationIssue,
  SearchValidationResult,
} from './types';

const issue = (code: string, message: string): SearchValidationIssue => ({
  code,
  message,
});

const ok = (): SearchValidationResult => ({ valid: true, issues: [] });

const fail = (issues: SearchValidationIssue[]): SearchValidationResult => ({
  valid: false,
  issues,
});

export function validateRawSearchQuery(input: RawSearchQueryInput): SearchValidationResult {
  const text = input.text?.trim();

  if (text === undefined || text.length === 0) {
    return ok();
  }

  if (text.length < SEARCH_MIN_QUERY_LENGTH) {
    return fail([issue('QUERY_TOO_SHORT', 'Search text is too short')]);
  }

  if (text.length > SEARCH_MAX_QUERY_LENGTH) {
    return fail([issue('QUERY_TOO_LONG', 'Search text exceeds maximum length')]);
  }

  return ok();
}

export function validateFacetConstraints(
  constraints: SearchFacetConstraints
): SearchValidationResult {
  const issues: SearchValidationIssue[] = [];

  if (constraints.minRating !== undefined) {
    if (!Number.isFinite(constraints.minRating) || constraints.minRating < 0 || constraints.minRating > 5) {
      issues.push(issue('INVALID_MIN_RATING', 'minRating must be between 0 and 5'));
    }
  }

  if (constraints.maxDeliveryMins !== undefined) {
    if (!Number.isFinite(constraints.maxDeliveryMins) || constraints.maxDeliveryMins < 0) {
      issues.push(issue('INVALID_MAX_DELIVERY', 'maxDeliveryMins must be a non-negative number'));
    }
  }

  if (constraints.maxDistanceKm !== undefined) {
    if (!Number.isFinite(constraints.maxDistanceKm) || constraints.maxDistanceKm <= 0) {
      issues.push(issue('INVALID_MAX_DISTANCE', 'maxDistanceKm must be greater than 0'));
    }
  }

  return issues.length > 0 ? fail(issues) : ok();
}

export function hasSearchIntent(
  input: RawSearchQueryInput,
  constraints: SearchFacetConstraints = {}
): boolean {
  const hasText = Boolean(input.text?.trim());
  const hasFacets =
    constraints.openNow === true ||
    constraints.vegOnly === true ||
    constraints.minRating !== undefined ||
    constraints.maxDeliveryMins !== undefined ||
    constraints.maxDistanceKm !== undefined;

  return hasText || hasFacets;
}
