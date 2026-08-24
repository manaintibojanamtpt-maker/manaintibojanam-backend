import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useLocationSessionStore } from '../src/features/location/store/locationSessionStore';
import { resolveBootstrapCoords } from '../src/features/discovery/hooks/useDiscoveryHome';
import { resolveActiveDeliveryCoords, readPersistedActiveLocationCoords } from '../src/features/location/domain/activeDeliveryLocation';
import { readNearestDiscoverySessionCache, writeDiscoverySessionCache, clearDiscoverySessionCacheForTests } from '../src/features/discovery/engine/discoverySessionCache';
import { seedDiscoveryQueryCacheFromSession } from '../src/features/discovery/engine/discoveryBootstrap';
import { queryClient } from '../src/shared/queryClient';
import { discoveryKeys } from '../src/features/discovery/hooks/discoveryQueryKeys';

const LOCATION_SESSION_STORAGE_KEY = 'ob-location-session-v1';

const SAMPLE_HOME = {
  locationLabel: 'Koregaon Park',
  collections: [
    {
      id: 'nearby',
      title: 'Nearby',
      subtitle: '',
      restaurants: [{ restaurantId: 'obr_test', displayName: 'Test Kitchen' }],
      backedByApi: true,
    },
  ],
} as const;

function installMemoryLocalStorage(): void {
  if (typeof globalThis.localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
    },
  });
}

describe('discovery bootstrap regression (Problem 1 fix)', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearDiscoverySessionCacheForTests();
    queryClient.clear();
    localStorage.removeItem(LOCATION_SESSION_STORAGE_KEY);
    useLocationSessionStore.setState({ activeLocation: null });
  });

  afterEach(() => {
    clearDiscoverySessionCacheForTests();
    queryClient.clear();
    localStorage.removeItem(LOCATION_SESSION_STORAGE_KEY);
  });

  it('resolveActiveDeliveryCoords returns coords from persisted localStorage before zustand rehydrates', () => {
    localStorage.setItem(LOCATION_SESSION_STORAGE_KEY, JSON.stringify({
      state: {
        activeLocation: {
          coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
        },
      },
      version: 0,
    }));

    const coords = resolveActiveDeliveryCoords(null);
    assert.ok(coords);
    assert.equal(coords!.lat.toFixed(4), '18.5362');
    assert.equal(coords!.lng.toFixed(4), '73.8937');
  });

  it('readPersistedActiveLocationCoords returns coords synchronously', () => {
    localStorage.setItem(LOCATION_SESSION_STORAGE_KEY, JSON.stringify({
      state: {
        activeLocation: {
          coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
        },
      },
      version: 0,
    }));

    const coords = readPersistedActiveLocationCoords();
    assert.ok(coords);
    assert.equal(coords.lat.toFixed(4), '18.5362');
    assert.equal(coords.lng.toFixed(4), '73.8937');
  });

  it('resolveBootstrapCoords returns cached coords without waiting for zustand rehydration', () => {
    localStorage.setItem(LOCATION_SESSION_STORAGE_KEY, JSON.stringify({
      state: {
        activeLocation: {
          coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
        },
      },
      version: 0,
    }));

    const coords = resolveBootstrapCoords();
    assert.ok(coords);
    assert.equal(coords.lat.toFixed(4), '18.5362');
    assert.equal(coords.lng.toFixed(4), '73.8937');
  });

  it('query enabled with bootstrap coords reads from session cache immediately', () => {
    localStorage.setItem(LOCATION_SESSION_STORAGE_KEY, JSON.stringify({
      state: {
        activeLocation: {
          coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
        },
      },
      version: 0,
    }));

    writeDiscoverySessionCache(18.5362, 73.8937, {}, SAMPLE_HOME);
    // Seed the react-query cache from session cache (this is what the bootstrap does)
    seedDiscoveryQueryCacheFromSession();

    const queryKey = discoveryKeys.home(18.5362, 73.8937, {});
    const cached = queryClient.getQueryData(queryKey);

    // Should find nearest cache entry
    const nearest = readNearestDiscoverySessionCache(18.5362, 73.8937, {});
    assert.deepEqual(nearest, SAMPLE_HOME);
    assert.deepEqual(cached, SAMPLE_HOME);
  });

  it('resolveBootstrapCoords returns stable reference for same coordinates', () => {
    localStorage.setItem(LOCATION_SESSION_STORAGE_KEY, JSON.stringify({
      state: {
        activeLocation: {
          coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
        },
      },
      version: 0,
    }));

    const coords1 = resolveBootstrapCoords();
    const coords2 = resolveBootstrapCoords();
    const coords3 = resolveBootstrapCoords();

    // Same reference — Object.is comparison should not trigger re-renders
    assert.strictEqual(coords1, coords2);
    assert.strictEqual(coords2, coords3);
    assert.equal(coords1!.lat, 18.5362);
    assert.equal(coords1!.lng, 73.8937);
  });

  it('resolveBootstrapCoords returns null when no location persisted', () => {
    localStorage.removeItem(LOCATION_SESSION_STORAGE_KEY);
    useLocationSessionStore.setState({ activeLocation: null });

    const coords = resolveBootstrapCoords();
    assert.equal(coords, null);
  });

  it('live coords take precedence over bootstrap once store rehydrates', () => {
    localStorage.setItem(LOCATION_SESSION_STORAGE_KEY, JSON.stringify({
      state: {
        activeLocation: {
          coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
        },
      },
      version: 0,
    }));

    // Simulate zustand rehydrated with a different location
    useLocationSessionStore.setState({
      activeLocation: {
        coordinates: { lat: 19.0, lng: 72.0, source: 'gps', capturedAt: Date.now().toString() },
        displayLabel: 'New Location',
        kind: 'current',
      },
    });

    const coords = resolveActiveDeliveryCoords(useLocationSessionStore.getState().activeLocation);
    assert.ok(coords);
    assert.equal(coords.lat, 19.0);
    assert.equal(coords.lng, 72.0);
  });
});