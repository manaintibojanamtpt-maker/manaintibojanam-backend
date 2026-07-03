/**
 * SearchSDK — autocomplete orchestration via existing repository reads (M4 PR-9).
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { AutocompleteFilter, SearchSuggestion } from '../dto';
import { filterCatalogByPrefix, POPULAR_CUISINE_SUGGESTIONS } from '../providers/SuggestionCatalog';
import type { SearchRepository } from '../repository/SearchRepository';
import { mapRepositoryError } from './mapRepositoryError';
import { mapRestaurantHitsToSuggestions, mergeSuggestions } from './SuggestionMapper';

const MIN_PREFIX_LENGTH = 2;

export async function invokeSearchAutocomplete(
  repository: SearchRepository,
  filter: AutocompleteFilter
): SdkAsyncResult<SearchSuggestion[]> {
  const prefix = filter.prefix.trim();
  const limit = filter.limit ?? 8;

  if (prefix.length < MIN_PREFIX_LENGTH) {
    return sdkOk([]);
  }

  const groups: SearchSuggestion[][] = [];

  if (!filter.kind || filter.kind === 'restaurant') {
    const restaurants = await repository.searchRestaurants({ text: prefix, limit });
    if (restaurants.ok === false) {
      return mapRepositoryError(restaurants.error);
    }
    groups.push(mapRestaurantHitsToSuggestions(restaurants.value));
  }

  if (!filter.kind || filter.kind === 'cuisine') {
    groups.push(filterCatalogByPrefix(POPULAR_CUISINE_SUGGESTIONS, prefix, limit));
  }

  return sdkOk(mergeSuggestions(groups, limit));
}
