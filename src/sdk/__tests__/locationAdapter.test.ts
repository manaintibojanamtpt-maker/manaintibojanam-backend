import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import {
  createLocationSDK,
  createReferenceSdkReferenceProvider,
  createLocationRepositoryImpl,
  createStubLocationProvider,
} from '../location/createLocationSDK';
import type { LocationProvider } from '../location/providers/LocationProvider';
import { resetStaticBundleProviderCache } from '../reference/createReferenceSDK';

describe('LocationSDK adapter (M2 PR-6)', () => {
  it('createLocationSDK returns DefaultLocationAdapter surface', () => {
    const sdk = createLocationSDK();
    assert.equal(typeof sdk.searchAddress, 'function');
    assert.equal(typeof sdk.calculateDistance, 'function');
    assert.equal(typeof sdk.encodeGeohash, 'function');
  });

  it('stub provider methods return NOT_CONFIGURED', async () => {
    const sdk = createLocationSDK();
    const search = await sdk.searchAddress('Pune');
    assert.equal(search.ok, false);
    if (!search.ok) {
      assert.equal(search.error.code, 'NOT_CONFIGURED');
    }

    const detect = await sdk.detectCurrentLocation();
    assert.equal(detect.ok, false);
    if (!detect.ok) {
      assert.equal(detect.error.code, 'NOT_CONFIGURED');
    }

    const validate = await sdk.validateAddress({ stateCode: 'MH' });
    assert.equal(validate.ok, false);
    if (!validate.ok) {
      assert.equal(validate.error.code, 'NOT_CONFIGURED');
    }
  });

  it('discovery methods return NOT_CONFIGURED', async () => {
    const sdk = createLocationSDK();
    const point = { lat: 18.52, lng: 73.85 };

    const branches = await sdk.findNearbyBranches(point, { radiusKm: 5 });
    assert.equal(branches.ok, false);
    if (!branches.ok) {
      assert.equal(branches.error.code, 'NOT_CONFIGURED');
    }

    const restaurants = await sdk.findNearbyRestaurants(point, { radiusKm: 5 });
    assert.equal(restaurants.ok, false);
    if (!restaurants.ok) {
      assert.equal(restaurants.error.code, 'NOT_CONFIGURED');
    }
  });

  it('repository stub returns NOT_CONFIGURED', async () => {
    const repo = createLocationRepositoryImpl();
    const result = await repo.getLocationById('loc-1' as import('../location/types/branded').LocationId);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_CONFIGURED');
    }
  });

  it('calculateDistance returns Haversine km with optional road factor', () => {
    const sdk = createLocationSDK();
    const from = { lat: 18.52, lng: 73.85 };
    const to = { lat: 18.53, lng: 73.86 };

    const straight = sdk.calculateDistance(from, to);
    assert.equal(straight.ok, true);
    if (straight.ok) {
      assert.ok(straight.value.distanceKm > 0);
      assert.equal(straight.value.unit, 'km');
    }

    const adjusted = sdk.calculateDistance(from, to, { roadFactor: 1.2 });
    assert.equal(adjusted.ok, true);
    if (adjusted.ok && straight.ok) {
      assert.ok(adjusted.value.distanceKm > straight.value.distanceKm);
    }
  });

  it('encodeGeohash and decodeGeohash round-trip', () => {
    const sdk = createLocationSDK();
    const point = { lat: 18.5204, lng: 73.8567 };

    const encoded = sdk.encodeGeohash(point, 7);
    assert.equal(encoded.ok, true);
    if (!encoded.ok) {
      return;
    }
    assert.equal(encoded.value.length, 7);

    const decoded = sdk.decodeGeohash(encoded.value);
    assert.equal(decoded.ok, true);
    if (decoded.ok) {
      assert.ok(Math.abs(decoded.value.lat - point.lat) < 0.01);
      assert.ok(Math.abs(decoded.value.lng - point.lng) < 0.01);
    }
  });

  it('decodeGeohash rejects invalid hash', () => {
    const sdk = createLocationSDK();
    const result = sdk.decodeGeohash('!!!');
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('custom LocationProvider is delegated when configured', async () => {
    const provider: LocationProvider = {
      kind: 'cache',
      searchAddress: async () =>
        sdkOk([
          {
            displayName: 'Mock Pune',
            point: { lat: 18.52, lng: 73.85 },
            confidence: 1,
            provider: 'local',
          },
        ]),
    };

    const sdk = createLocationSDK({ locationProvider: provider });
    const result = await sdk.searchAddress('Pune');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value[0]?.displayName, 'Mock Pune');
    }
  });

  it('ReferenceSdkReferenceProvider maps hierarchy from ReferenceSDK', async () => {
    resetStaticBundleProviderCache();
    const { createReferenceSDK } = await import('../reference/createReferenceSDK');
    const refProvider = createReferenceSdkReferenceProvider(createReferenceSDK());

    const states = await refProvider.getStates('IN');
    assert.equal(states.ok, true);
    if (states.ok) {
      assert.ok(states.value.length >= 1);
      assert.ok(states.value.some((state) => state.code === 'MH'));
    }

    const districts = await refProvider.getDistricts('MH');
    assert.equal(districts.ok, true);
    if (districts.ok) {
      assert.ok(districts.value.length >= 1);
    }
  });

  it('stub LocationProvider is used by default', () => {
    const provider = createStubLocationProvider();
    assert.equal(provider.kind, 'stub');
  });
});
