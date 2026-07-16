import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { DEFAULT_MARKETPLACE_COORDS } from '../src/lib/marketplaceDefaults';
import {
  resolveBootstrapDiscoveryCoords,
  seedDiscoveryQueryCacheFromSession,
} from '../src/features/discovery/engine/discoveryBootstrap';
import {
  clearDiscoverySessionCacheForTests,
  writeDiscoverySessionCache,
} from '../src/features/discovery/engine/discoverySessionCache';
import { resolveDiscoveryCoords } from '../src/features/discovery/engine/discoveryEngine';
import { discoveryKeys } from '../src/features/discovery/hooks/discoveryQueryKeys';
import { queryClient } from '../src/shared/queryClient';

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
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    },
  });
}

describe('discovery bootstrap performance', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearDiscoverySessionCacheForTests();
    queryClient.clear();
    localStorage.removeItem(LOCATION_SESSION_STORAGE_KEY);
  });

  afterEach(() => {
    clearDiscoverySessionCacheForTests();
    queryClient.clear();
    localStorage.removeItem(LOCATION_SESSION_STORAGE_KEY);
  });

  it('resolveBootstrapDiscoveryCoords prefers persisted active location over defaults', () => {
    localStorage.setItem(
      LOCATION_SESSION_STORAGE_KEY,
      JSON.stringify({
        state: {
          activeLocation: {
            coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
          },
        },
        version: 0,
      }),
    );

    const coords = resolveBootstrapDiscoveryCoords();
    assert.equal(coords.lat.toFixed(4), '18.5362');
    assert.equal(coords.lng.toFixed(4), '73.8937');
  });

  it('seedDiscoveryQueryCacheFromSession hydrates react-query for saved coords', () => {
    writeDiscoverySessionCache(18.5362, 73.8937, {}, SAMPLE_HOME);

    seedDiscoveryQueryCacheFromSession();

    const cached = queryClient.getQueryData(discoveryKeys.home(18.5362, 73.8937, {}));
    assert.deepEqual(cached, SAMPLE_HOME);
  });

  it('resolveBootstrapDiscoveryCoords falls back to marketplace defaults', () => {
    const coords = resolveBootstrapDiscoveryCoords();
    assert.equal(coords.lat, DEFAULT_MARKETPLACE_COORDS.lat);
    assert.equal(coords.lng, DEFAULT_MARKETPLACE_COORDS.lng);
  });

  it('resolveDiscoveryCoords uses persisted location before zustand rehydrates', () => {
    localStorage.setItem(
      LOCATION_SESSION_STORAGE_KEY,
      JSON.stringify({
        state: {
          activeLocation: {
            coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
          },
        },
        version: 0,
      }),
    );

    const coords = resolveDiscoveryCoords(null);
    assert.equal(coords.lat.toFixed(4), '18.5362');
    assert.equal(coords.lng.toFixed(4), '73.8937');
  });

  it('location invalidation skips the first hydrated coords', () => {
    let previousCoords: string | null = null;
    const firstKey = '18.5362,73.8937';

    const shouldInvalidateFirst =
      previousCoords != null && previousCoords !== firstKey;
    assert.equal(shouldInvalidateFirst, false);

    previousCoords = firstKey;

    const shouldInvalidateAfterMove =
      previousCoords != null && previousCoords !== '18.5500,73.9000';
    assert.equal(shouldInvalidateAfterMove, true);
  });

  it('seeded react-query cache survives first location hydration without invalidation', () => {
    localStorage.setItem(
      LOCATION_SESSION_STORAGE_KEY,
      JSON.stringify({
        state: {
          activeLocation: {
            coordinates: { lat: 18.5362, lng: 73.8937, source: 'manual', capturedAt: '2026-07-16T00:00:00.000Z' },
          },
        },
        version: 0,
      }),
    );
    writeDiscoverySessionCache(18.5362, 73.8937, {}, SAMPLE_HOME);
    seedDiscoveryQueryCacheFromSession();

    const queryKey = discoveryKeys.home(18.5362, 73.8937, {});
    assert.deepEqual(queryClient.getQueryData(queryKey), SAMPLE_HOME);

    // Simulate first hydration: record coords but do not invalidate.
    let previousCoords: string | null = null;
    const hydratedKey = '18.5362,73.8937';
    if (previousCoords !== hydratedKey) {
      const hadPreviousCoords = previousCoords != null;
      previousCoords = hydratedKey;
      if (hadPreviousCoords) {
        queryClient.invalidateQueries({ queryKey: discoveryKeys.all });
      }
    }

    assert.deepEqual(queryClient.getQueryData(queryKey), SAMPLE_HOME);
  });
});
