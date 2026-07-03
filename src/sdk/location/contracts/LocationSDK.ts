/**
 * LocationSDK — public contract (interface only; M2 PR-2 foundation).
 * ADR-011: strangler vertical slice for location intelligence.
 *
 * No Firestore, REST, Nominatim, MapLibre, or browser APIs in this contract.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { GeohashPrecision } from '../types/branded';
import type {
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
  IndiaAddressInput,
  ValidatedAddress,
} from '../dto/address';
import type { BranchDiscoveryResult, NearbyBranchFilter, NearbyRestaurantFilter, RestaurantDiscoveryResult } from '../dto/discovery';
import type {
  DistanceOptions,
  DistanceResult,
  GeoPoint,
  GeoPointWithAccuracy,
  GeolocationOptions,
} from '../dto/geo';

import type { LocationSDKOptions } from '../shared/options';

/**
 * Public location SDK surface for presentation layer.
 * Implementations arrive in M2 PR-3+ adapters — not in PR-2.
 */
export interface LocationSDK {
  /** Address Intelligence — autocomplete / search. */
  searchAddress(
    query: string,
    options?: AddressSearchOptions
  ): SdkAsyncResult<AddressSearchResult[]>;

  /** Address Intelligence — structured or free-text → coordinates. */
  forwardGeocode(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress>;

  /** Address Intelligence — coordinates → address components. */
  reverseGeocode(point: GeoPoint): SdkAsyncResult<GeocodedAddress>;

  /** Address Intelligence — validate against India Address Model. */
  validateAddress(address: IndiaAddressInput): SdkAsyncResult<ValidatedAddress>;

  /** Map Intelligence — browser geolocation (via provider in future PRs). */
  detectCurrentLocation(options?: GeolocationOptions): SdkAsyncResult<GeoPointWithAccuracy>;

  /** Delivery Intelligence — Haversine distance with optional road factor. */
  calculateDistance(
    from: GeoPoint,
    to: GeoPoint,
    options?: DistanceOptions
  ): SdkResult<DistanceResult>;

  /** Discovery Intelligence — encode WGS84 point to geohash. */
  encodeGeohash(point: GeoPoint, precision?: GeohashPrecision): SdkResult<string>;

  /** Discovery Intelligence — decode geohash to approximate point. */
  decodeGeohash(hash: string): SdkResult<GeoPoint>;

  /** Branch Intelligence — nearby branches for tenant or platform scope. */
  findNearbyBranches(
    point: GeoPoint,
    filter: NearbyBranchFilter
  ): SdkAsyncResult<BranchDiscoveryResult[]>;

  /** Discovery Intelligence — marketplace restaurant discovery. */
  findNearbyRestaurants(
    point: GeoPoint,
    filter: NearbyRestaurantFilter
  ): SdkAsyncResult<RestaurantDiscoveryResult[]>;
}

export interface LocationSDKFactory {
  create(options?: LocationSDKOptions): LocationSDK;
}
