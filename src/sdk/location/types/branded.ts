/**
 * LocationSDK — branded identifier types.
 */

import type { IsoDateTime } from '../../core/types';

export type BranchId = string & { readonly __brand: 'BranchId' };
export type LocationId = string & { readonly __brand: 'LocationId' };
export type Geohash = string & { readonly __brand: 'Geohash' };

/** Geohash precision levels used by discovery pre-filter and storage. */
export type GeohashPrecision = 5 | 6 | 7 | 8 | 9;

export type CountryCode = 'IN';

export type CoordinateSource = 'map_pin' | 'gps' | 'geocode' | 'manual';

export type DistanceUnit = 'km' | 'm';

export type GeocodingProviderKind = 'nominatim' | 'local' | 'cache' | 'stub';

export type BrowserLocationProviderKind = 'browser' | 'stub';

export type MapProviderKind = 'maplibre' | 'stub';

export type LocationProviderKind =
  | 'nominatim'
  | 'browser'
  | 'cache'
  | 'postgis'
  | 'stub';

export type DiscoverySortBy = 'distance' | 'rating' | 'eta' | 'delivery_fee';

export type GeoTimestamp = IsoDateTime;
