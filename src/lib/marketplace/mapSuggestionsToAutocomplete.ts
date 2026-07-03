/**
 * M4 PR-9 — SDK suggestions → marketplace autocomplete items.
 */

import type { SearchSuggestion } from '../../sdk/search/dto';
import type { AutocompleteItem, AutocompleteItemSource } from './autocompleteTypes';

const mapSource = (suggestion: SearchSuggestion): AutocompleteItemSource => {
  if (suggestion.payload?.placeholder === 'true') {
    return 'trending';
  }

  if (suggestion.label.toLowerCase().includes('near you')) {
    return 'nearby';
  }

  if (suggestion.kind === 'cuisine') {
    return 'suggestion';
  }

  return 'autocomplete';
};

export const mapSearchSuggestionToItem = (
  suggestion: SearchSuggestion,
  sourceOverride?: AutocompleteItemSource
): AutocompleteItem => ({
  id: suggestion.id,
  label: suggestion.label,
  source: sourceOverride ?? mapSource(suggestion),
  kind: suggestion.kind,
  payload: suggestion.payload,
});

export const mapSearchSuggestionsToItems = (
  suggestions: readonly SearchSuggestion[],
  sourceOverride?: AutocompleteItemSource
): AutocompleteItem[] =>
  suggestions.map((entry) => mapSearchSuggestionToItem(entry, sourceOverride));

export const mapRecentSearchesToItems = (queries: readonly string[]): AutocompleteItem[] =>
  queries.map((query) => ({
    id: `recent-${query.toLowerCase()}`,
    label: query,
    source: 'recent' as const,
    kind: 'tag' as const,
  }));
