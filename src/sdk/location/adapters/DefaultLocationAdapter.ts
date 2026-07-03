/**
 * LocationSDK — public adapter delegating to repository and providers (M2 PR-6).
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { GeohashPrecision } from '../types/branded';
import type { LocationSDK } from '../contracts/LocationSDK';
import type {
  AddressSearchOptions,
  AddressSearchResult,
  ForwardGeocodeInput,
  GeocodedAddress,
  IndiaAddressInput,
  ValidatedAddress,
} from '../dto/address';
import type {
  BranchDiscoveryResult,
  NearbyBranchFilter,
  NearbyRestaurantFilter,
  RestaurantDiscoveryResult,
} from '../dto/discovery';
import type {
  DistanceOptions,
  DistanceResult,
  GeoPoint,
  GeoPointWithAccuracy,
  GeolocationOptions,
} from '../dto/geo';
import type { LocationAdapterDeps } from './LocationPorts';
import {
  computeDistance,
  decodeGeohashPoint,
  encodeGeohashPoint,
} from './localGeoComputation';
import { locationNotConfiguredAsync } from './notConfigured';

export class DefaultLocationAdapter implements LocationSDK {
  constructor(private readonly deps: LocationAdapterDeps) {}

  searchAddress(
    query: string,
    options?: AddressSearchOptions
  ): SdkAsyncResult<AddressSearchResult[]> {
    const geocoding = this.deps.providerRegistry?.getGeocoding();
    if (geocoding) {
      return geocoding.searchAddress(query, options);
    }
    const provider = this.deps.locationProvider;
    if (provider.searchAddress) {
      return provider.searchAddress(query, options);
    }
    return locationNotConfiguredAsync('searchAddress', 'LocationProvider');
  }

  forwardGeocode(input: ForwardGeocodeInput): SdkAsyncResult<GeocodedAddress> {
    const geocoding = this.deps.providerRegistry?.getGeocoding();
    if (geocoding) {
      return geocoding.forwardGeocode(input);
    }
    const provider = this.deps.locationProvider;
    if (provider.forwardGeocode) {
      return provider.forwardGeocode(input);
    }
    return locationNotConfiguredAsync('forwardGeocode', 'LocationProvider');
  }

  reverseGeocode(point: GeoPoint): SdkAsyncResult<GeocodedAddress> {
    const geocoding = this.deps.providerRegistry?.getGeocoding();
    if (geocoding) {
      return geocoding.reverseGeocode(point);
    }
    const provider = this.deps.locationProvider;
    if (provider.reverseGeocode) {
      return provider.reverseGeocode(point);
    }
    return locationNotConfiguredAsync('reverseGeocode', 'LocationProvider');
  }

  validateAddress(_address: IndiaAddressInput): SdkAsyncResult<ValidatedAddress> {
    void this.deps.referenceProvider;
    return locationNotConfiguredAsync('validateAddress', 'DefaultLocationAdapter (domain PR pending)');
  }

  detectCurrentLocation(options?: GeolocationOptions): SdkAsyncResult<GeoPointWithAccuracy> {
    const browser = this.deps.providerRegistry?.getBrowser();
    if (browser) {
      return browser.detectCurrentLocation(options);
    }
    const provider = this.deps.locationProvider;
    if (provider.detectCurrentLocation) {
      return provider.detectCurrentLocation(options);
    }
    return locationNotConfiguredAsync('detectCurrentLocation', 'LocationProvider');
  }

  calculateDistance(
    from: GeoPoint,
    to: GeoPoint,
    options?: DistanceOptions
  ): SdkResult<DistanceResult> {
    return computeDistance(from, to, options);
  }

  encodeGeohash(point: GeoPoint, precision?: GeohashPrecision): SdkResult<string> {
    return encodeGeohashPoint(point, precision ?? 7);
  }

  decodeGeohash(hash: string): SdkResult<GeoPoint> {
    return decodeGeohashPoint(hash);
  }

  findNearbyBranches(
    _point: GeoPoint,
    _filter: NearbyBranchFilter
  ): SdkAsyncResult<BranchDiscoveryResult[]> {
    void this.deps.repository;
    return locationNotConfiguredAsync(
      'findNearbyBranches',
      'DefaultLocationAdapter (discovery PR pending)'
    );
  }

  findNearbyRestaurants(
    _point: GeoPoint,
    _filter: NearbyRestaurantFilter
  ): SdkAsyncResult<RestaurantDiscoveryResult[]> {
    return locationNotConfiguredAsync(
      'findNearbyRestaurants',
      'DefaultLocationAdapter (discovery PR pending)'
    );
  }
}

export function createDefaultLocationAdapter(deps: LocationAdapterDeps): DefaultLocationAdapter {
  return new DefaultLocationAdapter(deps);
}
