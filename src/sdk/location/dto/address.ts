/**
 * LocationSDK — India address DTOs (M2 India Address Model).
 */

import type {
  CoordinateSource,
  CountryCode,
  GeoTimestamp,
  GeocodingProviderKind,
} from '../types/branded';
import type { GeoPoint, LocationGeoJson } from './geo';

export interface IndiaAddressInput {
  readonly country?: CountryCode;
  readonly stateCode?: string;
  readonly stateName?: string;
  readonly districtCode?: string;
  readonly districtName?: string;
  readonly cityCode?: string;
  readonly cityName?: string;
  readonly areaCode?: string;
  readonly areaName?: string;
  readonly pincode?: string;
  readonly street?: string;
  readonly landmark?: string;
  readonly coordinates?: GeoPoint;
}

export interface GeoCoordinates {
  readonly lat: number;
  readonly lng: number;
  readonly accuracyM?: number;
  readonly source: CoordinateSource;
  readonly capturedAt: GeoTimestamp;
}

export interface IndiaAddress {
  readonly country: CountryCode;
  readonly stateCode: string;
  readonly stateName: string;
  readonly districtCode: string;
  readonly districtName: string;
  readonly cityCode: string;
  readonly cityName: string;
  readonly areaCode: string;
  readonly areaName: string;
  readonly pincode: string;
  readonly street: string;
  readonly landmark?: string;
  readonly coordinates: GeoCoordinates;
  readonly geohash: string;
  readonly formattedAddress?: string;
}

export interface ValidatedAddress {
  readonly address: IndiaAddress;
  readonly geohash: string;
  readonly geoJson: LocationGeoJson;
  readonly warnings?: readonly string[];
}

export interface AddressSearchOptions {
  readonly countryCode?: CountryCode;
  readonly limit?: number;
  readonly bias?: GeoPoint;
  readonly cityContext?: string;
}

export interface AddressSearchResult {
  readonly displayName: string;
  readonly point: GeoPoint;
  readonly pincode?: string;
  readonly confidence: number;
  readonly provider: GeocodingProviderKind;
}

export interface ForwardGeocodeInput {
  readonly query?: string;
  readonly structured?: Partial<IndiaAddressInput>;
}

export interface GeocodedAddress {
  readonly point: GeoPoint;
  readonly parsed?: Partial<IndiaAddressInput>;
  readonly formattedAddress: string;
  readonly geohash: string;
}
