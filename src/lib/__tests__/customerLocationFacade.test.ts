import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { LocationSDK } from '../../sdk/location/contracts/LocationSDK';
import {
  detectCustomerLocation,
} from '../customerLocation/CustomerLocationFacade';
import { mapGeocodedToCustomerCanonical } from '../customerLocation/mapGeocodedToCustomerCanonical';
import type { CustomerLocationServices } from '../customerLocation/CustomerLocationFacade';
import { readCustomerLocationSession, clearCustomerLocationSession } from '../customerLocation/sessionStore';

const mockSessionStorage = (): Map<string, string> => {
  const store = new Map<string, string>();
  const original = globalThis.sessionStorage;

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });

  return store;
};

const createMockServices = (overrides: {
  detect?: LocationSDK['detectCurrentLocation'];
  reverse?: LocationSDK['reverseGeocode'];
} = {}): CustomerLocationServices => {
  const location = {
    detectCurrentLocation: overrides.detect ?? (async () =>
      sdkOk({
        lat: 18.5204,
        lng: 73.8567,
        accuracyM: 15,
        timestamp: 1_700_000_000_000,
      })),
    reverseGeocode: overrides.reverse ?? (async () =>
      sdkOk({
        point: { lat: 18.5204, lng: 73.8567 },
        geohash: 'tdr1w',
        formattedAddress: 'FC Road, Pune, Maharashtra, India',
        parsed: {
          stateName: 'Maharashtra',
          cityName: 'Pune',
          areaName: 'FC Road',
          pincode: '411005',
          street: 'FC Road',
          country: 'IN',
        },
      })),
  } as unknown as LocationSDK;

  return { location };
};

describe('CustomerLocationFacade (M2 PR-10)', () => {
  it('mapGeocodedToCustomerCanonical builds structured customer location', () => {
    const canonical = mapGeocodedToCustomerCanonical(
      { lat: 18.52, lng: 73.85, accuracyM: 10, timestamp: 123 as never },
      {
        point: { lat: 18.52, lng: 73.85 },
        geohash: 'tdr1w',
        formattedAddress: 'FC Road, Pune',
        parsed: { cityName: 'Pune', pincode: '411005' },
      }
    );

    assert.equal(canonical.country, 'IN');
    assert.equal(canonical.coordinateSource, 'gps');
    assert.equal(canonical.geohash, 'tdr1w');
    assert.equal(canonical.cityName, 'Pune');
  });

  it('detectCustomerLocation reverse geocodes GPS and persists session', async () => {
    mockSessionStorage();
    clearCustomerLocationSession();

    const services = createMockServices();
    const result = await detectCustomerLocation({ timeoutMs: 5000 }, services);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.formattedAddress.includes('Pune'), true);

    const session = readCustomerLocationSession();
    assert.ok(session);
    assert.equal(session?.geohash, 'tdr1w');
  });

  it('detectCustomerLocation propagates permission denied from browser provider', async () => {
    const services = createMockServices({
      detect: async () => ({
        ok: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Location permission denied',
          details: { reason: 'PERMISSION_DENIED' },
        },
      }),
    });

    const result = await detectCustomerLocation(undefined, services);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'FORBIDDEN');
  });

  it('detectCustomerLocation fails when reverse geocode fails', async () => {
    const services = createMockServices({
      reverse: async () => ({
        ok: false,
        error: { code: 'UNAVAILABLE', message: 'Reverse geocode failed' },
      }),
    });

    const result = await detectCustomerLocation(undefined, services);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });
});
