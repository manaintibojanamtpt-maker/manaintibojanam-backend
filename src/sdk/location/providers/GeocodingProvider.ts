/**
 * LocationSDK — geocoding provider contract (M2 PR-7).
 * Implementations: Nominatim, cache — future PRs. No HTTP in PR-7.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { GeocodingProviderKind } from '../types/branded';
import type {
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
} from '../dto/address';
import type { GeoPoint } from '../dto/geo';

export interface GeocodingProvider {
  readonly kind: GeocodingProviderKind;

  searchAddress(
    query: string,
    options?: AddressSearchOptions
  ): SdkAsyncResult<AddressSearchResult[]>;

  forwardGeocode(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress>;

  reverseGeocode(point: GeoPoint): SdkAsyncResult<GeocodedAddress>;
}

export interface GeocodingProviderFactory {
  create(options?: { kind?: GeocodingProviderKind }): GeocodingProvider;
}
