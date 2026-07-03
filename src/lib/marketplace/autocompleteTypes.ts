/**
 * M4 PR-9 — marketplace autocomplete view model types.
 */

import type { SearchSuggestion } from '../../sdk/search/dto';

export type AutocompleteItemSource =
  | 'recent'
  | 'autocomplete'
  | 'suggestion'
  | 'popular'
  | 'nearby'
  | 'trending';

export type AutocompletePanelStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface AutocompleteItem {
  readonly id: string;
  readonly label: string;
  readonly source: AutocompleteItemSource;
  readonly kind: SearchSuggestion['kind'];
  readonly payload?: Readonly<Record<string, string>>;
}

export interface AutocompleteSection {
  readonly id: string;
  readonly title: string;
  readonly items: readonly AutocompleteItem[];
}

export interface MarketplaceAutocompleteViewModel {
  readonly status: AutocompletePanelStatus;
  readonly open: boolean;
  readonly prefix: string;
  readonly sections: readonly AutocompleteSection[];
  readonly activeIndex: number;
  readonly error?: {
    readonly code: string;
    readonly userMessage: string;
    readonly retryable: boolean;
  };
  readonly autocompleteEnabled: boolean;
  readonly suggestionsEnabled: boolean;
}
