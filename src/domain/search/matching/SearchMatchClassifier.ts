/**
 * Search domain — text match classification (M4 PR-2).
 */

import { SEARCH_FIELD_NAMES } from '../shared/SearchConstants';
import { SEARCH_MATCH_TYPE_SIGNALS, type SearchMatchType } from '../shared/SearchMatchType';
import { normalizeForMatch, normalizeTagToken } from '../shared/SearchLanguage';
import type { ClassifiedMatch } from '../shared/types';

const noneMatch = (field: string): ClassifiedMatch => ({
  matchType: 'none',
  signal: SEARCH_MATCH_TYPE_SIGNALS.none,
  field,
  label: 'No match',
});

const classified = (
  matchType: Exclude<SearchMatchType, 'none' | 'facet'>,
  field: string,
  label: string
): ClassifiedMatch => ({
  matchType,
  signal: SEARCH_MATCH_TYPE_SIGNALS[matchType],
  field,
  label,
});

/**
 * Classify how query text matches a single field value.
 * Priority: exact → prefix → contains → none.
 */
export function classifyTextMatch(query: string, fieldValue: string, field: string): ClassifiedMatch {
  const normalizedQuery = normalizeForMatch(query);
  const normalizedField = normalizeForMatch(fieldValue);

  if (!normalizedQuery || !normalizedField) {
    return noneMatch(field);
  }

  if (normalizedField === normalizedQuery) {
    return classified('exact', field, 'Exact match');
  }

  if (normalizedField.startsWith(normalizedQuery)) {
    return classified('prefix', field, 'Prefix match');
  }

  if (normalizedField.includes(normalizedQuery)) {
    return classified('contains', field, 'Contains match');
  }

  return noneMatch(field);
}

/**
 * Classify best match across multiple query tokens for one field.
 */
export function classifyTokenMatch(
  tokens: readonly string[],
  fieldValue: string,
  field: string
): ClassifiedMatch {
  let best = noneMatch(field);

  for (const token of tokens) {
    const current = classifyTextMatch(token, fieldValue, field);
    if (current.signal > best.signal) {
      best = current;
    }
    if (best.matchType === 'exact') {
      break;
    }
  }

  return best;
}

/**
 * Classify restaurant name match using full query then token fallback.
 */
export function classifyRestaurantNameMatch(
  normalizedText: string,
  tokens: readonly string[],
  restaurantName: string
): ClassifiedMatch {
  const full = classifyTextMatch(normalizedText, restaurantName, SEARCH_FIELD_NAMES.RESTAURANT_NAME);
  if (full.matchType !== 'none') {
    return { ...full, label: 'Restaurant name match' };
  }

  return classifyTokenMatch(tokens, restaurantName, SEARCH_FIELD_NAMES.RESTAURANT_NAME);
}

/**
 * Classify tag overlap using slug-normalized tokens.
 */
export function classifyTagOverlap(
  queryTags: readonly string[],
  candidateTags: readonly string[],
  field: string = SEARCH_FIELD_NAMES.TAG
): ClassifiedMatch {
  if (queryTags.length === 0 || candidateTags.length === 0) {
    return noneMatch(field);
  }

  const normalizedQuery = new Set(queryTags.map(normalizeTagToken));
  const normalizedCandidate = candidateTags.map(normalizeTagToken);
  const overlap = normalizedCandidate.filter((tag) => normalizedQuery.has(tag));

  if (overlap.length === 0) {
    return noneMatch(field);
  }

  const ratio = overlap.length / normalizedQuery.size;
  const signal = Math.min(1, SEARCH_MATCH_TYPE_SIGNALS.contains * ratio + 0.1);

  return {
    matchType: 'contains',
    signal,
    field,
    label: 'Tag overlap',
  };
}

/** @deprecated Use exported functions — alias for spec naming */
export const SearchMatchClassifier = {
  classifyTextMatch,
  classifyTokenMatch,
  classifyRestaurantNameMatch,
  classifyTagOverlap,
};
