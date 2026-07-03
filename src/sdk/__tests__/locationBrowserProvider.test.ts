import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import type { BrowserGeolocationPort } from '../location/providers/browser/BrowserGeolocationPort';
import { createBrowserLocationProviderImpl } from '../location/providers/browser/BrowserLocationProviderImpl';
import { createBrowserLocationProvider } from '../location/providers/ProviderFactory';

const createMockPort = (overrides: Partial<BrowserGeolocationPort> = {}): BrowserGeolocationPort => ({
  isAvailable: () => true,
  getCurrentPosition: async () => ({
    lat: 18.5204,
    lng: 73.8567,
    accuracyM: 12,
    timestamp: 1_700_000_000_000,
  }),
  ...overrides,
});

describe('BrowserLocationProvider (M2 PR-10)', () => {
  it('isSupported reflects geolocation port availability', () => {
    const available = createBrowserLocationProviderImpl({
      geolocationPort: createMockPort({ isAvailable: () => true }),
    });
    const unavailable = createBrowserLocationProviderImpl({
      geolocationPort: createMockPort({ isAvailable: () => false }),
    });

    assert.equal(available.isSupported().ok, true);
    if (available.isSupported().ok) {
      assert.equal(available.isSupported().value, true);
    }
    assert.equal(unavailable.isSupported().ok, true);
    if (unavailable.isSupported().ok) {
      assert.equal(unavailable.isSupported().value, false);
    }
  });

  it('detectCurrentLocation returns coordinates from mocked port', async () => {
    const provider = createBrowserLocationProviderImpl({ geolocationPort: createMockPort() });
    const result = await provider.detectCurrentLocation();

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.lat, 18.5204);
    assert.equal(result.value.lng, 73.8567);
    assert.equal(result.value.accuracyM, 12);
  });

  it('maps permission denied to FORBIDDEN', async () => {
    const provider = createBrowserLocationProviderImpl({
      geolocationPort: createMockPort({
        getCurrentPosition: async () => {
          throw { code: 'PERMISSION_DENIED', message: 'denied' };
        },
      }),
    });

    const result = await provider.detectCurrentLocation();
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'FORBIDDEN');
  });

  it('maps timeout to UNAVAILABLE with retryable details', async () => {
    const provider = createBrowserLocationProviderImpl({
      geolocationPort: createMockPort({
        getCurrentPosition: async () => {
          throw { code: 'TIMEOUT', message: 'timeout' };
        },
      }),
    });

    const result = await provider.detectCurrentLocation();
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
    assert.equal(result.error.details?.reason, 'TIMEOUT');
    assert.equal(result.error.details?.retryable, true);
  });

  it('maps unsupported geolocation to UNAVAILABLE', async () => {
    const provider = createBrowserLocationProviderImpl({
      geolocationPort: createMockPort({ isAvailable: () => false }),
    });

    const result = await provider.detectCurrentLocation();
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('createBrowserLocationProvider({ kind: browser }) returns browser provider', () => {
    const provider = createBrowserLocationProvider({
      kind: 'browser',
      browserImpl: { geolocationPort: createMockPort() },
    });
    assert.equal(provider.kind, 'browser');
  });
});
