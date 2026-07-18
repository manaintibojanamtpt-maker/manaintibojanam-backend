import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  clearDiscoverySessionCacheForTests,
  getDiscoverySessionCacheUpdatedAt,
  readDiscoverySessionCache,
  writeDiscoverySessionCache,
} from '../src/features/discovery/engine/discoverySessionCache';
import {
  clearFoodSessionCacheForTests,
  getFoodSessionCacheUpdatedAt,
  readFoodSessionCache,
  writeFoodSessionCache,
} from '../src/features/food/engine/foodSessionCache';

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

const SAMPLE_MENU = {
  slug: 'test-kitchen',
  restaurantName: 'Test Kitchen',
  categories: [{ id: 'all', name: 'All', itemCount: 1 }],
  items: [
    {
      id: 'item-1',
      name: 'Dosa',
      description: '',
      price: 80,
      categoryId: 'all',
      isVeg: true,
      isAvailable: true,
    },
  ],
  featuredIds: [],
  todaysSpecialIds: [],
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

describe('session cache phase 2', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearDiscoverySessionCacheForTests();
    clearFoodSessionCacheForTests();
  });

  afterEach(() => {
    clearDiscoverySessionCacheForTests();
    clearFoodSessionCacheForTests();
  });

  it('discovery session cache reads by coords + filters with TTL metadata', () => {
    writeDiscoverySessionCache(18.5362, 73.8937, {}, SAMPLE_HOME);
    assert.deepEqual(readDiscoverySessionCache(18.5362, 73.8937, {}), SAMPLE_HOME);
    assert.ok(getDiscoverySessionCacheUpdatedAt(18.5362, 73.8937, {}));
  });

  it('food session cache reads by slug + coords', () => {
    writeFoodSessionCache('test-kitchen', 18.5362, 73.8937, SAMPLE_MENU);
    assert.deepEqual(readFoodSessionCache('test-kitchen', 18.5362, 73.8937), SAMPLE_MENU);
    assert.ok(getFoodSessionCacheUpdatedAt('test-kitchen', 18.5362, 73.8937));
  });
});
