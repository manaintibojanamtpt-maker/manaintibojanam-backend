/**
 * SearchSDK — repository hits → SearchSuggestion mapping (M4 PR-9).
 */

import type { SearchIndexHit, SearchSuggestion } from '../dto';

export const mapRestaurantHitToSuggestion = (hit: SearchIndexHit): SearchSuggestion => ({
  id: `restaurant-${String(hit.tenantId)}`,
  label: hit.snippet?.trim() || String(hit.tenantId),
  kind: 'restaurant',
  score: hit.score,
  payload: {
    tenantId: String(hit.tenantId),
    field: hit.field,
    matchType: hit.matchType,
  },
});

export const mapRestaurantHitsToSuggestions = (
  hits: readonly SearchIndexHit[]
): SearchSuggestion[] => hits.map(mapRestaurantHitToSuggestion);

export const mergeSuggestions = (
  groups: readonly SearchSuggestion[][],
  limit = 10
): SearchSuggestion[] => {
  const seen = new Set<string>();
  const merged: SearchSuggestion[] = [];

  for (const group of groups) {
    for (const suggestion of group) {
      const key = `${suggestion.kind}:${suggestion.label.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(suggestion);
      if (merged.length >= limit) {
        return merged;
      }
    }
  }

  return merged;
};
