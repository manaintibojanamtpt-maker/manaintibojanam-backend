/**
 * M2 PR-10 — GeocodedAddress + GPS point → CustomerCanonicalLocation.
 */

import type { GeocodedAddress } from '../../sdk/location/dto/address';
import type { GeoPointWithAccuracy } from '../../sdk/location/dto/geo';
import type { CustomerCanonicalLocation } from './types';

export function mapGeocodedToCustomerCanonical(
  point: GeoPointWithAccuracy,
  geocoded: GeocodedAddress
): CustomerCanonicalLocation {
  const parsed = geocoded.parsed;

  return {
    country: 'IN',
    stateName: parsed?.stateName,
    districtName: parsed?.districtName,
    cityName: parsed?.cityName,
    localityName: parsed?.areaName,
    pincode: parsed?.pincode,
    street: parsed?.street,
    lat: point.lat,
    lng: point.lng,
    accuracyM: point.accuracyM,
    geohash: geocoded.geohash,
    formattedAddress: geocoded.formattedAddress,
    coordinateSource: 'gps',
    detectedAt: point.timestamp as number,
  };
}
