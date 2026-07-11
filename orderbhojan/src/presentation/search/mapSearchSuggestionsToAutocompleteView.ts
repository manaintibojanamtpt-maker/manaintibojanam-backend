import type {
  AutocompleteItem,
  MarketplaceAutocompleteViewModel,
} from '@bhojan/storefront-design-system/marketplace/types';
import type { SearchSuggestion } from '@/types/marketplace-search';

function mapSuggestionKind(
  type: SearchSuggestion['type'],
): AutocompleteItem['kind'] {
  switch (type) {
    case 'restaurant':
      return 'restaurant';
    case 'food':
      return 'food';
    case 'cuisine':
      return 'cuisine';
    case 'collection':
      return 'tag';
    default:
      return 'tag';
  }
}

export function mapSearchSuggestionsToAutocompleteView(input: {
  readonly suggestions: readonly SearchSuggestion[] | undefined;
  readonly query: string;
  readonly isFocused: boolean;
  readonly isFetching: boolean;
  readonly isError: boolean;
  readonly activeIndex: number;
}): MarketplaceAutocompleteViewModel {
  const trimmed = input.query.trim();

  if (!input.isFocused || !trimmed) {
    return {
      status: 'idle',
      open: false,
      prefix: trimmed,
      sections: [],
      activeIndex: -1,
      autocompleteEnabled: true,
      suggestionsEnabled: true,
    };
  }

  const items: AutocompleteItem[] = (input.suggestions ?? []).map((suggestion) => ({
    id: suggestion.id,
    label: suggestion.label,
    source: 'suggestion',
    kind: mapSuggestionKind(suggestion.type),
    payload: { type: suggestion.type },
  }));

  if (input.isFetching && items.length === 0) {
    return {
      status: 'loading',
      open: true,
      prefix: trimmed,
      sections: [],
      activeIndex: -1,
      autocompleteEnabled: true,
      suggestionsEnabled: true,
    };
  }

  if (input.isError) {
    return {
      status: 'error',
      open: true,
      prefix: trimmed,
      sections: items.length
        ? [{ id: 'suggestions', title: 'Suggestions', items }]
        : [],
      activeIndex: input.activeIndex,
      autocompleteEnabled: true,
      suggestionsEnabled: true,
      error: {
        code: 'suggestions_error',
        userMessage: 'Suggestions temporarily unavailable.',
        retryable: true,
      },
    };
  }

  if (items.length === 0) {
    return {
      status: 'empty',
      open: true,
      prefix: trimmed,
      sections: [],
      activeIndex: -1,
      autocompleteEnabled: true,
      suggestionsEnabled: true,
    };
  }

  return {
    status: 'ready',
    open: true,
    prefix: trimmed,
    sections: [{ id: 'suggestions', title: 'Suggestions', items }],
    activeIndex: input.activeIndex,
    autocompleteEnabled: true,
    suggestionsEnabled: true,
  };
}

export function flattenAutocompleteItems(view: MarketplaceAutocompleteViewModel): readonly AutocompleteItem[] {
  return view.sections.flatMap((section) => section.items);
}
