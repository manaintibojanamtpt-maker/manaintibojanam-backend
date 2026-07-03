/**
 * LocationSDK — backend results → GeocodingProvider DTOs (M2 PR-8).
 */

import type { AddressSearchResult, ForwardGeocodeInput, GeocodedAddress } from '../../dto/address';
import type { GeoPoint } from '../../dto/geo';
import type { GeocodingProviderKind } from '../../types/branded';
import { encodeGeohashPoint } from '../../adapters/localGeoComputation';
import type { OpenGeocodingBackendResult } from './OpenGeocodingPorts';
import type { OpenGeocodingConfig } from './OpenGeocodingConfig';
import { sdkError, sdkFail, sdkOk } from '../../../core/resultHelpers';
import type { SdkResult } from '../../../core/result';

const PROVIDER_KIND: GeocodingProviderKind = 'nominatim';

const normalizeConfidence = (importance?: number): number => {
  if (importance === undefined || !Number.isFinite(importance)) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, importance));
};

export function buildForwardGeocodeQuery(input: ForwardGeocodeInput): SdkResult<string> {
  if (input.query?.trim()) {
    return sdkOk(input.query.trim());
  }

  const structured = input.structured;
  if (!structured) {
    return sdkFail(sdkError('VALIDATION', 'Forward geocode requires query or structured address'));
  }

  const parts = [
    structured.street,
    structured.landmark,
    structured.areaName,
    structured.cityName,
    structured.districtName,
    structured.stateName,
    structured.pincode,
    'India',
  ].filter((part): part is string => Boolean(part && part.trim()));

  if (parts.length === 0) {
    return sdkFail(sdkError('VALIDATION', 'Structured forward geocode has no usable fields'));
  }

  return sdkOk(parts.join(', '));
}

export function mapBackendToSearchResults(
  results: readonly OpenGeocodingBackendResult[]
): AddressSearchResult[] {
  return results.map((result) => ({
    displayName: result.displayName,
    point: { lat: result.lat, lng: result.lng },
    pincode: result.address?.postcode,
    confidence: normalizeConfidence(result.importance),
    provider: PROVIDER_KIND,
  }));
}

export function mapBackendToGeocodedAddress(
  result: OpenGeocodingBackendResult,
  config: OpenGeocodingConfig,
  pointOverride?: GeoPoint
): SdkResult<GeocodedAddress> {
  const point = pointOverride ?? { lat: result.lat, lng: result.lng };
  const geohashResult = encodeGeohashPoint(point, config.geohashPrecision);
  if (geohashResult.ok === false) {
    return sdkFail(geohashResult.error);
  }

  const address = result.address;
  return sdkOk({
    point,
    formattedAddress: result.displayName,
    geohash: geohashResult.value,
    parsed: address
      ? {
          pincode: address.postcode,
          stateName: address.state,
          districtName: address.state_district,
          cityName: address.city ?? address.town ?? address.village,
          areaName: address.suburb ?? address.neighbourhood,
          street: address.road,
          country: address.country_code?.toUpperCase() === 'IN' ? 'IN' : undefined,
        }
      : undefined,
  });
}

export function buildOpenGeocodingCacheKey(prefix: string, payload: string): string {
  return `open-geocoding:${prefix}:${payload.trim().toLowerCase()}`;
}
