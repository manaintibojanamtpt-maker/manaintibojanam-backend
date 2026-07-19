import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { syncRestaurantContextFromMenuCache } from '../src/features/food/engine/foodExperienceLayer';
import {
  setActiveMenuRouteSlug,
  getActiveMenuRouteSlug,
} from '../src/features/food/engine/foodMenuRouteContext';
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
    setActiveMenuRouteSlug(null);
    useRestaurantContextStore.getState().clear();
    useCartStore.getState().clear();
    useCartStore.setState({ restaurantSlug: null, visible: false });
  });

  afterEach(() => {
    clearFoodSessionCacheForTests();
    setActiveMenuRouteSlug(null);
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
    assert.equal(ctx.restaurantId, 'obr_demo-dosa-corner');
    assert.equal(ctx.contextToken, 'menu_demo-dosa-corner');
  });

  it('restores context from in-memory menu when session cache is empty', () => {
    const synced = syncRestaurantContextFromMenuCache(
      'demo-dosa-corner',
      18.5362,
      73.8937,
      SAMPLE_MENU,
    );
    assert.equal(synced, true);
    assert.equal(useRestaurantContextStore.getState().restaurantSlug, 'demo-dosa-corner');
    assert.equal(useRestaurantContextStore.getState().restaurantId, 'obr_demo-dosa-corner');

    useCartStore.getState().addItem(
      { foodId: 'plain-dosa', name: 'Plain Dosa', price: 80 },
      1,
    );
    assert.equal(useCartStore.getState().lines.length, 1);
  });

  it('sets provisional context from route slug when no menu cache exists', () => {
    const synced = syncRestaurantContextFromMenuCache('demo-dosa-corner', 18.5362, 73.8937);
    assert.equal(synced, true);
    assert.equal(useRestaurantContextStore.getState().restaurantSlug, 'demo-dosa-corner');
    assert.equal(useRestaurantContextStore.getState().restaurantId, 'obr_demo-dosa-corner');
    assert.equal(useRestaurantContextStore.getState().contextToken, 'menu_demo-dosa-corner');

    useCartStore.getState().addItem(
      { foodId: 'plain-dosa', name: 'Plain Dosa', price: 80 },
      1,
    );
    assert.equal(useCartStore.getState().lines.length, 1);
  });

  it('restores context after slug sanitize when menu data is already loaded', () => {
    useRestaurantContextStore.getState().setContext({
      restaurantSlug: 'demo-biryani-house',
      contextToken: 'ctx_biryani',
      restaurantId: 'obr_demo_biryani_001',
    });
    useCartStore.setState({
      restaurantSlug: 'demo-biryani-house',
      lines: [
        {
          lineId: 'biryani-1',
          foodId: 'biryani-1',
          name: 'Mutton Biryani',
          price: 299,
          quantity: 1,
          restaurantSlug: 'demo-biryani-house',
          restaurantId: 'obr_demo_biryani_001',
        },
      ],
    });

    sanitizeRestaurantSlugContext('demo-dosa-corner');
    assert.equal(useRestaurantContextStore.getState().restaurantSlug, null);

    const synced = syncRestaurantContextFromMenuCache(
      'demo-dosa-corner',
      18.5362,
      73.8937,
      SAMPLE_MENU,
    );
    assert.equal(synced, true);
    assert.equal(useRestaurantContextStore.getState().restaurantSlug, 'demo-dosa-corner');

    useCartStore.getState().addItem(
      { foodId: 'plain-dosa', name: 'Plain Dosa', price: 80 },
      1,
    );
    assert.equal(useCartStore.getState().lines.length, 1);
  });

  it('cart add falls back to cart restaurant slug when context store is empty', () => {
    useRestaurantContextStore.getState().clear();
    useCartStore.setState({ restaurantSlug: 'demo-dosa-corner', lines: [], visible: false });

    useCartStore.getState().addItem(
      { foodId: 'plain-dosa', name: 'Plain Dosa', price: 80 },
      1,
    );

    assert.equal(useCartStore.getState().lines.length, 1);
    assert.equal(useCartStore.getState().lines[0]?.restaurantSlug, 'demo-dosa-corner');
    assert.equal(useCartStore.getState().lines[0]?.restaurantId, 'obr_demo-dosa-corner');
  });

  it('cart add falls back to active menu route slug during persist rehydration window', () => {
    useRestaurantContextStore.getState().clear();
    useCartStore.setState({ restaurantSlug: null, lines: [], visible: false });
    setActiveMenuRouteSlug('demo-dosa-corner');

    useCartStore.getState().addItem(
      { foodId: 'plain-dosa', name: 'Plain Dosa', price: 80 },
      1,
    );

    assert.equal(getActiveMenuRouteSlug(), 'demo-dosa-corner');
    assert.equal(useCartStore.getState().lines.length, 1);
    assert.equal(useCartStore.getState().lines[0]?.restaurantSlug, 'demo-dosa-corner');
    assert.equal(useCartStore.getState().lines[0]?.restaurantId, 'obr_demo-dosa-corner');
  });
});
