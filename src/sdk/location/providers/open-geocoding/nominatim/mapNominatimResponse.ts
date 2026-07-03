/**
 * LocationSDK — Nominatim → vendor-neutral backend mappers (M2 PR-8).
 */

import type { OpenGeocodingBackendResult } from '../OpenGeocodingPorts';
import type { NominatimReverseResult, NominatimSearchResult } from './nominatimTypes';

const parseCoordinate = (value: string, field: string): number | null => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
};

export function mapNominatimSearchResult(result: NominatimSearchResult): OpenGeocodingBackendResult | null {
  const lat = parseCoordinate(result.lat, 'lat');
  const lng = parseCoordinate(result.lon, 'lon');
  if (lat === null || lng === null) {
    return null;
  }

  return {
    lat,
    lng,
    displayName: result.display_name,
    importance: result.importance,
    address: result.address,
  };
}

export function mapNominatimSearchResults(
  results: readonly NominatimSearchResult[]
): OpenGeocodingBackendResult[] {
  return results
    .map(mapNominatimSearchResult)
    .filter((entry): entry is OpenGeocodingBackendResult => entry !== null);
}

export function mapNominatimReverseResult(
  result: NominatimReverseResult
): OpenGeocodingBackendResult | null {
  return mapNominatimSearchResult(result);
}
