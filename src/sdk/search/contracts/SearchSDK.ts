/**
 * SearchSDK — public contract (interface only; M4 PR-1).
 * ADR-011: search intelligence strangler slice.
 *
 * No Firestore, REST, or UI in this contract.
 * Consumes DiscoverySDK — does not replace it.
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  AutocompleteFilter,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from '../dto';
import type { CreateSearchSDKOptions } from '../shared/options';

/**
 * Public search SDK surface for presentation layer.
 * Implementations arrive in M4 PR-2+ adapters — not in foundation PR.
 */
export interface SearchSDK {
  /** Full search pipeline → ranked, explainable SearchResult. */
  search(query: SearchQuery): SdkAsyncResult<SearchResult>;

  /** Lightweight suggestions (top N). */
  suggest(query: SearchQuery): SdkAsyncResult<SearchSuggestion[]>;

  /** Prefix completions for search bar. */
  autocomplete(filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]>;
}

export interface SearchSDKFactory {
  create(options?: CreateSearchSDKOptions): SearchSDK;
}
