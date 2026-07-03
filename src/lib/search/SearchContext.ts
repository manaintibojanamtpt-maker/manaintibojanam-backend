/**
 * M4 PR-4 — Build SearchSDK query from customer location + facade input.
 */

import type { SdkResult } from '../../sdk/core/result';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type { SearchQuery } from '../../sdk/search/dto/query';
import type { Geohash } from '../../sdk/discovery/types/branded';
import {
  hasSearchIntent,
  validateFacetConstraints,
  validateRawSearchQuery,
} from '../../domain/search/shared/SearchValidation';
import { normalizeSearchQuery } from '../../domain/search/normalize/QueryNormalizer';
import type { CustomerCanonicalLocation } from '../customerLocation/types';
import type { SearchFacadeQuery } from './types';

export interface SearchContextInput {
  readonly facadeQuery: SearchFacadeQuery;
  readonly customerLocation: CustomerCanonicalLocation | null;
}

export interface SearchContextMeta {
  readonly usedCustomerSession: boolean;
  readonly normalizedText?: string;
  readonly inferredCuisineTags: readonly string[];
}

export interface BuiltSearchContext {
  readonly query: SearchQuery;
  readonly meta: SearchContextMeta;
}

export function buildSearchContext(input: SearchContextInput): SdkResult<BuiltSearchContext> {
  const facetConstraints = {
    openNow: input.facadeQuery.openNow,
    vegOnly: input.facadeQuery.vegOnly,
    minRating: input.facadeQuery.minRating,
    maxDeliveryMins: input.facadeQuery.maxDeliveryMins,
    maxDistanceKm: input.facadeQuery.maxDistanceKm,
  };

  if (!hasSearchIntent({ text: input.facadeQuery.text }, facetConstraints)) {
    return sdkFail(sdkError('VALIDATION', 'Search text or at least one filter is required'));
  }

  const rawValidation = validateRawSearchQuery({ text: input.facadeQuery.text });
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

  const point = resolveCustomerPoint(input.facadeQuery, input.customerLocation);
  if (!point.ok) {
    return point;
  }

  const normalized = input.facadeQuery.text?.trim()
    ? normalizeSearchQuery({ text: input.facadeQuery.text })
    : {
        ok: true as const,
        query: {
          normalizedText: '',
          tokens: [],
          inferredCuisineTags: [],
        },
      };

  if (!normalized.ok) {
    return sdkFail(
      sdkError('VALIDATION', normalized.validation.issues[0]?.message ?? 'Could not normalize query')
    );
  }

  const geohash = resolveCustomerGeohash(input.facadeQuery, input.customerLocation);
  const cuisineTags = mergeTags(input.facadeQuery.cuisineTags, normalized.query.inferredCuisineTags);

  return sdkOk({
    query: {
      text: input.facadeQuery.text?.trim() || undefined,
      customerPoint: point.value,
      customerGeohash: geohash,
      radiusKm: input.facadeQuery.radiusKm,
      limit: input.facadeQuery.limit,
      openNow: input.facadeQuery.openNow,
      vegOnly: input.facadeQuery.vegOnly,
      minRating: input.facadeQuery.minRating,
      maxDeliveryMins: input.facadeQuery.maxDeliveryMins,
      maxDistanceKm: input.facadeQuery.maxDistanceKm,
      filters: buildStructuredFilters(input.facadeQuery, cuisineTags),
    },
    meta: {
      usedCustomerSession: !input.facadeQuery.customerPoint && input.customerLocation !== null,
      normalizedText: normalized.query.normalizedText || undefined,
      inferredCuisineTags: normalized.query.inferredCuisineTags,
    },
  });
}

function buildStructuredFilters(
  facadeQuery: SearchFacadeQuery,
  cuisineTags: readonly string[]
) {
  const hasArea =
    facadeQuery.areaCode ||
    facadeQuery.localityName ||
    facadeQuery.cityName ||
    facadeQuery.pincode ||
    facadeQuery.districtName;

  const hasFilters =
    facadeQuery.text ||
    cuisineTags.length > 0 ||
    facadeQuery.tags?.length ||
    hasArea;

  if (!hasFilters) {
    return undefined;
  }

  return {
    restaurantName: facadeQuery.text?.trim() || undefined,
    cuisine: cuisineTags.length > 0 ? { tags: cuisineTags, matchMode: 'any' as const } : undefined,
    area: hasArea
      ? {
          areaCode: facadeQuery.areaCode,
          localityName: facadeQuery.localityName,
          cityName: facadeQuery.cityName,
          pincode: facadeQuery.pincode,
          districtName: facadeQuery.districtName,
        }
      : undefined,
    tags: facadeQuery.tags?.length ? { tags: facadeQuery.tags, matchMode: 'any' as const } : undefined,
  };
}

function mergeTags(
  explicit?: readonly string[],
  inferred?: readonly string[]
): readonly string[] {
  const merged = new Set<string>();
  explicit?.forEach((tag) => merged.add(tag));
  inferred?.forEach((tag) => merged.add(tag));
  return [...merged];
}

function resolveCustomerPoint(
  facadeQuery: SearchFacadeQuery,
  customerLocation: CustomerCanonicalLocation | null
): SdkResult<{ lat: number; lng: number }> {
  if (facadeQuery.customerPoint) {
    const { lat, lng } = facadeQuery.customerPoint;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      return sdkFail(sdkError('VALIDATION', 'Invalid customer coordinates override'));
    }
    return sdkOk({ lat, lng });
  }

  if (!customerLocation) {
    return sdkFail(
      sdkError('VALIDATION', 'Customer location is required for search', {
        field: 'customerPoint',
      })
    );
  }

  if (!Number.isFinite(customerLocation.lat) || !Number.isFinite(customerLocation.lng)) {
    return sdkFail(sdkError('VALIDATION', 'Stored customer location has invalid coordinates'));
  }

  return sdkOk({ lat: customerLocation.lat, lng: customerLocation.lng });
}

function resolveCustomerGeohash(
  facadeQuery: SearchFacadeQuery,
  customerLocation: CustomerCanonicalLocation | null
): Geohash | undefined {
  const override = facadeQuery.customerGeohash?.trim();
  if (override) {
    return override as Geohash;
  }
  return customerLocation?.geohash as Geohash | undefined;
}
