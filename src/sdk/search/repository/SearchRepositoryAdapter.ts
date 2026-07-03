/**
 * SearchSDK — Firestore-backed SearchRepository adapter (M4 PR-3).
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { SearchRepository } from './SearchRepository';
import type {
  AreaSearchFilter,
  AutocompleteFilter,
  CuisineSearchFilter,
  FoodSearchFilter,
  RestaurantSearchFilter,
  SearchIndexHit,
  SearchSuggestion,
  SuggestFilter,
  TagSearchFilter,
} from '../dto';
import type { FoodItemHit } from '../dto/food';
import { searchNotConfiguredAsync } from '../adapters/notConfigured';
import type { FirestoreSearchRepository } from './FirestoreSearchRepository';
import {
  mapAreaSearchHits,
  mapCuisineSearchHits,
  mapRestaurantSearchHits,
  mapTagSearchHits,
} from './SearchIndexMapper';

const LAYER = 'SearchRepositoryAdapter';

export class SearchRepositoryAdapter implements SearchRepository {
  constructor(private readonly firestoreRepository: FirestoreSearchRepository) {}

  async searchRestaurants(filter: RestaurantSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    const tenants = await this.firestoreRepository.loadActiveTenants(filter.tenantIds);
    if (!tenants.ok) {
      return tenants as SdkResult<SearchIndexHit[]>;
    }

    return { ok: true, value: mapRestaurantSearchHits(tenants.value, filter) };
  }

  async searchCuisine(filter: CuisineSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    const tenants = await this.firestoreRepository.loadActiveTenants(filter.tenantIds);
    if (!tenants.ok) {
      return tenants as SdkResult<SearchIndexHit[]>;
    }

    return { ok: true, value: mapCuisineSearchHits(tenants.value, filter) };
  }

  searchFood(_filter: FoodSearchFilter): SdkAsyncResult<FoodItemHit[]> {
    return searchNotConfiguredAsync('searchFood', LAYER);
  }

  async searchArea(filter: AreaSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    const tenants = await this.firestoreRepository.loadActiveTenants();
    if (!tenants.ok) {
      return tenants as SdkResult<SearchIndexHit[]>;
    }

    return { ok: true, value: mapAreaSearchHits(tenants.value, filter) };
  }

  async searchTags(filter: TagSearchFilter): SdkAsyncResult<SearchIndexHit[]> {
    const tenants = await this.firestoreRepository.loadActiveTenants();
    if (!tenants.ok) {
      return tenants as SdkResult<SearchIndexHit[]>;
    }

    return { ok: true, value: mapTagSearchHits(tenants.value, filter) };
  }

  suggest(_filter: SuggestFilter): SdkAsyncResult<SearchSuggestion[]> {
    return searchNotConfiguredAsync('suggest', LAYER);
  }

  autocomplete(_filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]> {
    return searchNotConfiguredAsync('autocomplete', LAYER);
  }
}

export function createSearchRepositoryAdapter(
  firestoreRepository: FirestoreSearchRepository
): SearchRepository {
  return new SearchRepositoryAdapter(firestoreRepository);
}
