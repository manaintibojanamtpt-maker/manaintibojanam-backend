/**
 * SearchSDK — lightweight suggestion orchestration (M4 PR-9).
 */

import { normalizeSearchQuery } from '../../../domain/search/normalize/QueryNormalizer';
import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { SearchQuery, SearchSuggestion } from '../dto';
import {
  NEARBY_CUISINE_SUGGESTIONS,
  POPULAR_CUISINE_SUGGESTIONS,
  TRENDING_RESTAURANT_SUGGESTIONS,
  filterCatalogByPrefix,
} from '../providers/SuggestionCatalog';
import type { SearchRepository } from '../repository/SearchRepository';
import { mapRepositoryError } from './mapRepositoryError';
import { mapRestaurantHitsToSuggestions, mergeSuggestions } from './SuggestionMapper';

export async function invokeSearchSuggest(
  repository: SearchRepository,
  query: SearchQuery
): SdkAsyncResult<SearchSuggestion[]> {
  const limit = query.limit ?? 12;
  const text = query.text?.trim() ?? '';
  const groups: SearchSuggestion[][] = [
    [...POPULAR_CUISINE_SUGGESTIONS.slice(0, 4)],
    [...NEARBY_CUISINE_SUGGESTIONS.slice(0, 3)],
    [...TRENDING_RESTAURANT_SUGGESTIONS],
  ];

  if (text.length >= 2) {
    const restaurants = await repository.searchRestaurants({ text, limit: 5 });
    if (restaurants.ok === false) {
      return mapRepositoryError(restaurants.error);
    }
    groups.unshift(mapRestaurantHitsToSuggestions(restaurants.value));

    const normalized = normalizeSearchQuery({ text });
    if (normalized.ok && normalized.query.inferredCuisineTags.length > 0) {
      const cuisines = await repository.searchCuisine({
        tags: normalized.query.inferredCuisineTags,
        matchMode: 'any',
        limit: 5,
      });
      if (cuisines.ok === false) {
        return mapRepositoryError(cuisines.error);
      }
      groups.unshift(mapRestaurantHitsToSuggestions(cuisines.value));
    }

    groups.push(filterCatalogByPrefix(POPULAR_CUISINE_SUGGESTIONS, text, 5));
  }

  return sdkOk(mergeSuggestions(groups, limit));
}
