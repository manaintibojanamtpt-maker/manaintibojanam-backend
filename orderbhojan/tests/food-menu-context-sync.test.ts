import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { syncRestaurantContextFromMenuCache } from '../src/features/food/engine/foodExperienceLayer';
import {
  clearFoodSessionCacheForTests,
  writeFoodSessionCache,
} from '../src/features/food/engine/foodSessionCache';
import { useRestaurantContextStore } from '../src/features/restaurant/store/restaurantContextStore';
import { useCartStore } from '../src/features/cart/store/cartStore';
import { sanitizeRestaurantSlugContext } from '../src/lib/sanitizeLiveRestaurantContext';

const SAMPLE_MENU = {
  slug: 'demo-dosa-corner',
  restaurantName: 'Demo Dosa Corner',
  categories: [{ id: 'all', slug: 'all', name: 'All', itemCount: 1 }],
  items: [
    {
      foodId: 'plain-dosa',
      slug: 'plain-dosa',
      name: 'Plain Dosa',
      description: '',
      price: 80,
      categoryId: 'all',
      variants: [],
      addons: [],
      availability: true,
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

describe('syncRestaurantContextFromMenuCache', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    clearFoodSessionCacheForTests();
    useRestaurantContextStore.getState().clear();
    useCartStore.getState().clear();
    useCartStore.setState({ restaurantSlug: null, visible: false });
  });

  afterEach(() => {
    clearFoodSessionCacheForTests();
    useRestaurantContextStore.getState().clear();
    useCartStore.getState().clear();
  });

  it('restores cached menu context so cart add succeeds after slug sanitize', () => {
    writeFoodSessionCache('demo-dosa-corner', 18.5362, 73.8937, SAMPLE_MENU, {
      contextToken: 'ctx_dosa',
      restaurantId: 'obr_demo_dosa_corner',
    });

    useRestaurantContextStore.getState().setContext({
      restaurantSlug: 'demo-biryani-house',
      contextToken: 'ctx_biryani',
      restaurantId: 'obr_demo_biryani_001',
    });

    sanitizeRestaurantSlugContext('demo-dosa-corner');
    assert.equal(useRestaurantContextStore.getState().restaurantSlug, null);

    const synced = syncRestaurantContextFromMenuCache('demo-dosa-corner', 18.5362, 73.8937);
    assert.equal(synced, true);
    assert.equal(useRestaurantContextStore.getState().restaurantSlug, 'demo-dosa-corner');
    assert.equal(useRestaurantContextStore.getState().restaurantId, 'obr_demo_dosa_corner');
    assert.equal(useRestaurantContextStore.getState().contextToken, 'ctx_dosa');

    useCartStore.getState().addItem(
      { foodId: 'plain-dosa', name: 'Plain Dosa', price: 80 },
      1,
    );
    assert.equal(useCartStore.getState().lines.length, 1);
  });

  it('falls back when legacy menu cache has no stored context metadata', () => {
    writeFoodSessionCache('demo-dosa-corner', 18.5362, 73.8937, SAMPLE_MENU);

    syncRestaurantContextFromMenuCache('demo-dosa-corner', 18.5362, 73.8937);

    const ctx = useRestaurantContextStore.getState();
    assert.equal(ctx.restaurantSlug, 'demo-dosa-corner');
    assert.equal(ctx.restaurantId, 'rest_demo_dosa_corner');
    assert.equal(ctx.contextToken, 'menu_demo-dosa-corner');
  });
});
