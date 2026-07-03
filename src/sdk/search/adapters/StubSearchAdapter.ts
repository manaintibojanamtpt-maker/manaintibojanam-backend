/**
 * SearchSDK — stub adapter (M4 PR-1).
 * All methods return NOT_CONFIGURED until pipeline PR lands.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { SearchSDK } from '../contracts/SearchSDK';
import type {
  AutocompleteFilter,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from '../dto';
import { searchNotConfiguredAsync } from './notConfigured';

const LAYER = 'StubSearchAdapter';

export class StubSearchAdapter implements SearchSDK {
  search(_query: SearchQuery): SdkAsyncResult<SearchResult> {
    return searchNotConfiguredAsync('search', LAYER);
  }

  suggest(_query: SearchQuery): SdkAsyncResult<SearchSuggestion[]> {
    return searchNotConfiguredAsync('suggest', LAYER);
  }

  autocomplete(_filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]> {
    return searchNotConfiguredAsync('autocomplete', LAYER);
  }
}

export function createStubSearchAdapter(): SearchSDK {
  return new StubSearchAdapter();
}
