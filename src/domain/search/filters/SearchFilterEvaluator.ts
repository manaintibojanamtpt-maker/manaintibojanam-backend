/**
 * Search domain — facet and tag filter evaluation (M4 PR-2).
 */

import { normalizeTagToken } from '../shared/SearchLanguage';
import type {
  FilterEvaluationResult,
  SearchFacetConstraints,
  SearchFacetTarget,
  TagFilterConstraints,
  TagFilterTarget,
} from '../shared/types';

const pass = (appliedFacets: readonly string[]): FilterEvaluationResult => ({
  passed: true,
  appliedFacets,
});

const fail = (failedFacet: string, reason: string, appliedFacets: readonly string[] = []): FilterEvaluationResult => ({
  passed: false,
  appliedFacets,
  failedFacet,
  reason,
});

/**
 * Evaluate post-discovery facet constraints against a candidate.
 */
export function evaluateSearchFacets(
  target: SearchFacetTarget,
  constraints: SearchFacetConstraints
): FilterEvaluationResult {
  const applied: string[] = [];

  if (constraints.openNow === true) {
    if (!target.isOpen) {
      return fail('openNow', 'Kitchen is not open');
    }
    applied.push('openNow');
  }

  if (constraints.vegOnly === true) {
    if (!target.hasVegItems) {
      return fail('vegOnly', 'No vegetarian items available', applied);
    }
    applied.push('vegOnly');
  }

  if (constraints.minRating !== undefined) {
    const rating = target.rating ?? 0;
    if (rating < constraints.minRating) {
      return fail('minRating', `Rating ${rating} is below minimum ${constraints.minRating}`, applied);
    }
    applied.push('minRating');
  }

  if (constraints.maxDeliveryMins !== undefined) {
    const eta = target.etaMins;
    if (eta === undefined || eta > constraints.maxDeliveryMins) {
      return fail(
        'maxDeliveryMins',
        `ETA ${eta ?? 'unknown'} exceeds ${constraints.maxDeliveryMins} minutes`,
        applied
      );
    }
    applied.push('maxDeliveryMins');
  }

  if (constraints.maxDistanceKm !== undefined) {
    const distance = target.distanceKm;
    if (distance === undefined || distance > constraints.maxDistanceKm) {
      return fail(
        'maxDistanceKm',
        `Distance ${distance ?? 'unknown'} km exceeds ${constraints.maxDistanceKm} km`,
        applied
      );
    }
    applied.push('maxDistanceKm');
  }

  return pass(applied);
}

/**
 * Evaluate tag filter with any/all match mode.
 */
export function evaluateTagFilter(
  target: TagFilterTarget,
  constraints: TagFilterConstraints
): FilterEvaluationResult {
  const queryTags = constraints.tags.map(normalizeTagToken).filter(Boolean);
  if (queryTags.length === 0) {
    return pass([]);
  }

  const candidateTags = new Set(target.tags.map(normalizeTagToken).filter(Boolean));
  const mode = constraints.matchMode ?? 'any';

  if (mode === 'all') {
    const missing = queryTags.filter((tag) => !candidateTags.has(tag));
    if (missing.length > 0) {
      return fail('tags', `Missing tags: ${missing.join(', ')}`);
    }
    return pass(['tags']);
  }

  const hasAny = queryTags.some((tag) => candidateTags.has(tag));
  if (!hasAny) {
    return fail('tags', 'No matching tags found');
  }

  return pass(['tags']);
}

/** @deprecated Use evaluateSearchFacets — alias for spec naming */
export const SearchFilterEvaluator = {
  evaluateFacets: evaluateSearchFacets,
  evaluateTags: evaluateTagFilter,
};
