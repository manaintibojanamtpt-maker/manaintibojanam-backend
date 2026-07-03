/**
 * SearchSDK — SearchQuery validation (M4 PR-5).
 */

import {
  hasSearchIntent,
  validateFacetConstraints,
  validateRawSearchQuery,
} from '../../../domain/search/shared/SearchValidation';
import type { SdkResult } from '../../core/result';
import { sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { SearchFilter, SearchQuery } from '../dto';
import { SEARCH_ERROR_MESSAGES } from '../errors/searchErrors';

export function hasStructuredSearchFilters(filters?: SearchFilter): boolean {
  if (!filters) {
    return false;
  }

  const area = filters.area;
  const hasArea = Boolean(
    area?.areaCode?.trim() ||
      area?.localityName?.trim() ||
      area?.cityName?.trim() ||
      area?.pincode?.trim() ||
      area?.districtName?.trim()
  );

  return Boolean(
    filters.restaurantName?.trim() ||
      filters.cuisine?.tags?.length ||
      filters.tags?.tags?.length ||
      filters.foodItem?.trim() ||
      hasArea
  );
}

export function validateSearchQuery(query: SearchQuery): SdkResult<SearchQuery> {
  const point = query.customerPoint;
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
    return sdkFail(sdkError('VALIDATION', SEARCH_ERROR_MESSAGES.INVALID_QUERY, { field: 'customerPoint' }));
  }

  const facetConstraints = {
    openNow: query.openNow,
    vegOnly: query.vegOnly,
    minRating: query.minRating,
    maxDeliveryMins: query.maxDeliveryMins,
    maxDistanceKm: query.maxDistanceKm,
  };

  if (!hasSearchIntent({ text: query.text }, facetConstraints) && !hasStructuredSearchFilters(query.filters)) {
    return sdkFail(sdkError('VALIDATION', 'Search text or at least one filter is required'));
  }

  const rawValidation = validateRawSearchQuery({ text: query.text });
  if (!rawValidation.valid) {
    return sdkFail(
      sdkError('VALIDATION', rawValidation.issues[0]?.message ?? 'Invalid search query')
    );
  }

  const facetValidation = validateFacetConstraints(facetConstraints);
  if (!facetValidation.valid) {
    return sdkFail(
      sdkError('VALIDATION', facetValidation.issues[0]?.message ?? 'Invalid search filters')
    );
  }

  return sdkOk(query);
}
