/**
 * LocationSDK — external geo service provider contract (strategy pattern).
 * Implementations: Nominatim, browser geolocation, cache — M2 PR-4+.
 *
 * No implementation in PR-2.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { LocationProviderKind } from '../types/branded';
import type {
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
} from '../dto/address';
import type { GeoPoint, GeoPointWithAccuracy, GeolocationOptions } from '../dto/geo';

export interface LocationProvider {
  readonly kind: LocationProviderKind;

  /** Forward geocode / address search. */
  searchAddress?(
    query: string,
    options?: AddressSearchOptions
  ): SdkAsyncResult<AddressSearchResult[]>;

  forwardGeocode?(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress>;

  reverseGeocode?(point: GeoPoint): SdkAsyncResult<GeocodedAddress>;

  /** Browser geolocation — only when kind is `browser`. */
  detectCurrentLocation?(options?: GeolocationOptions): SdkAsyncResult<GeoPointWithAccuracy>;
}

export interface LocationProviderFactory {
  create(kind: LocationProviderKind): LocationProvider;
}

export interface CreateLocationProviderOptions {
  readonly kind?: LocationProviderKind;
}
