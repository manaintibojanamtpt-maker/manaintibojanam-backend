import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import { createLocationSDK } from '../location/createLocationSDK';
import {
  createBrowserLocationProvider,
  createCompositeLocationProvider,
  createDefaultLocationProviderRegistry,
  createGeocodingProvider,
  createLocationProviderFramework,
  createMapProvider,
  DEFAULT_BROWSER_LOCATION_PROVIDER_KIND,
  DEFAULT_GEOCODING_PROVIDER_KIND,
  DEFAULT_MAP_PROVIDER_KIND,
} from '../location/providers/ProviderFactory';
import type { GeocodingProvider } from '../location/providers/GeocodingProvider';
import { createNoOpOpenGeocodingRateLimiter } from '../location/providers/open-geocoding/OpenGeocodingRateLimiter';

describe('Location provider framework (M2 PR-7)', () => {
  it('defaults all provider kinds to stub', () => {
    assert.equal(DEFAULT_GEOCODING_PROVIDER_KIND, 'stub');
    assert.equal(DEFAULT_BROWSER_LOCATION_PROVIDER_KIND, 'stub');
    assert.equal(DEFAULT_MAP_PROVIDER_KIND, 'stub');
  });

  it('createDefaultLocationProviderRegistry returns three stub slots', () => {
    const registry = createDefaultLocationProviderRegistry();
    assert.equal(registry.getGeocoding().kind, 'stub');
    assert.equal(registry.getBrowser().kind, 'stub');
    assert.equal(registry.getMap().kind, 'stub');
  });

  it('registry.register replaces geocoding slot', async () => {
    const registry = createDefaultLocationProviderRegistry();
    const mockGeocoding: GeocodingProvider = {
      kind: 'local',
      searchAddress: async () =>
        sdkOk([
          {
            displayName: 'Injected',
            point: { lat: 1, lng: 2 },
            confidence: 1,
            provider: 'local',
          },
        ]),
      forwardGeocode: async () =>
        sdkOk({
          point: { lat: 1, lng: 2 },
          formattedAddress: 'Injected',
          geohash: 'abc',
        }),
      reverseGeocode: async () =>
        sdkOk({
          point: { lat: 1, lng: 2 },
          formattedAddress: 'Injected',
          geohash: 'abc',
        }),
    };

    registry.register('geocoding', mockGeocoding);
    const composite = createCompositeLocationProvider(registry);
    const result = await composite.searchAddress?.('test');
    assert.equal(result?.ok, true);
    if (result?.ok) {
      assert.equal(result.value[0]?.displayName, 'Injected');
    }
  });

  it('stub geocoding returns NOT_CONFIGURED', async () => {
    const provider = createGeocodingProvider();
    const result = await provider.forwardGeocode({ query: 'Pune' });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_CONFIGURED');
    }
  });

  it('stub browser provider reports unsupported without navigator', () => {
    const provider = createBrowserLocationProvider();
    const supported = provider.isSupported();
    assert.equal(supported.ok, true);
    if (supported.ok) {
      assert.equal(supported.value, false);
    }
  });

  it('stub browser detectCurrentLocation returns NOT_CONFIGURED', async () => {
    const provider = createBrowserLocationProvider();
    const result = await provider.detectCurrentLocation();
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_CONFIGURED');
    }
  });

  it('stub map provider returns India default viewport', () => {
    const provider = createMapProvider();
    const viewport = provider.getDefaultViewport();
    assert.equal(viewport.ok, true);
    if (viewport.ok) {
      assert.equal(viewport.value.zoom, 5);
      assert.ok(viewport.value.center.lat > 0);
    }
  });

  it('stub map validatePinPlacement returns NOT_CONFIGURED', () => {
    const provider = createMapProvider();
    const result = provider.validatePinPlacement({ lat: 18.52, lng: 73.85 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_CONFIGURED');
    }
  });

  it('browser kind creates BrowserLocationProvider with injectable port', () => {
    const provider = createBrowserLocationProvider({
      kind: 'browser',
      browserImpl: {
        geolocationPort: {
          isAvailable: () => true,
          getCurrentPosition: async () => ({
            lat: 12.97,
            lng: 77.59,
            accuracyM: 8,
            timestamp: Date.now(),
          }),
        },
      },
    });
    assert.equal(provider.kind, 'browser');
  });

  it('unsupported geocoding and map kinds throw at factory', () => {
    assert.throws(() => createGeocodingProvider({ kind: 'cache' }), /not implemented/i);
    assert.throws(() => createMapProvider({ kind: 'maplibre' }), /not implemented/i);
  });

  it('nominatim kind creates OpenGeocodingProvider', () => {
    const provider = createGeocodingProvider({
      kind: 'nominatim',
      openGeocoding: {
        rateLimiter: createNoOpOpenGeocodingRateLimiter(),
      },
    });
    assert.equal(provider.kind, 'nominatim');
  });

  it('createLocationProviderFramework wires registry and composite', () => {
    const framework = createLocationProviderFramework();
    assert.equal(framework.registry.getGeocoding().kind, 'stub');
    assert.equal(framework.locationProvider.kind, 'stub');
  });

  it('createLocationSDK injects provider registry into adapter', async () => {
    const mockGeocoding: GeocodingProvider = {
      kind: 'local',
      searchAddress: async () => sdkOk([]),
      forwardGeocode: async () =>
        sdkOk({
          point: { lat: 18.52, lng: 73.85 },
          formattedAddress: 'SDK inject',
          geohash: 'tej',
        }),
      reverseGeocode: async () =>
        sdkOk({
          point: { lat: 18.52, lng: 73.85 },
          formattedAddress: 'SDK inject',
          geohash: 'tej',
        }),
    };

    const registry = createDefaultLocationProviderRegistry().register('geocoding', mockGeocoding);
    const sdk = createLocationSDK({ providerRegistry: registry });
    const result = await sdk.forwardGeocode({ query: 'Pune' });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.formattedAddress, 'SDK inject');
    }
  });
});
