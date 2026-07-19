import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  rankMenuItemsByTerms,
  searchMenuItems,
  searchMenuItemsLocally,
  type SearchMenuItem,
} from '../search/menuItemSearch.js';

const sampleItems: SearchMenuItem[] = [
  {
    id: 'menu_1',
    tenantId: 'lucky-s-kitchen',
    restaurantSlug: 'lucky-s-kitchen',
    name: 'Hyderabadi Chicken Biryani',
    category: 'Biryani',
    description: 'Served with raita',
    price: 249,
    isVeg: false,
  },
  {
    id: 'menu_2',
    tenantId: 'lucky-s-kitchen',
    restaurantSlug: 'lucky-s-kitchen',
    name: 'Masala Dosa',
    category: 'South Indian',
    description: 'Crispy dosa with potato filling',
    price: 120,
    isVeg: true,
  },
];

const tinyFishTestConfig = {
  apiKey: 'test-key',
  enabled: true,
  location: 'IN',
  language: 'en',
  timeoutMs: 500,
  cacheTtlMs: 60_000,
} as const;

describe('menuItemSearch', () => {
  it('ranks local menu items by query terms', () => {
    const ranked = rankMenuItemsByTerms(sampleItems, ['biryani'], 5);
    assert.equal(ranked[0]?.name, 'Hyderabadi Chicken Biryani');
  });

  it('falls back to local search when TinyFish is disabled', async () => {
    const result = await searchMenuItems('dosa', sampleItems, 5, { tinyFishEnabled: false });
    assert.equal(result.provider, 'firestore-menu-search');
    assert.equal(result.items[0]?.name, 'Masala Dosa');
  });

  it('uses TinyFish-expanded terms and still returns owner menu items only', async () => {
    const result = await searchMenuItems('hyd biryani', sampleItems, 5, {
      tinyFishEnabled: true,
      config: tinyFishTestConfig,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            results: [{ title: 'Hyderabadi Chicken Biryani', snippet: 'Popular biryani dish' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    });

    assert.equal(result.provider, 'tinyfish-menu-search');
    assert.equal(result.items[0]?.name, 'Hyderabadi Chicken Biryani');
  });

  it('falls back to local search when TinyFish request fails', async () => {
    const result = await searchMenuItems('dosa', sampleItems, 5, {
      tinyFishEnabled: true,
      config: tinyFishTestConfig,
      fetchImpl: async () => new Response('upstream error', { status: 503 }),
    });

    assert.equal(result.provider, 'firestore-menu-search');
    assert.equal(result.items[0]?.name, 'Masala Dosa');
  });

  it('skips TinyFish when local menu items already match the query', async () => {
    const items: SearchMenuItem[] = [
      ...sampleItems,
      {
        id: 'menu_3',
        tenantId: 'lucky-s-kitchen',
        restaurantSlug: 'lucky-s-kitchen',
        name: 'Andhra Veg Thali (Mini)',
        category: 'Thali',
        price: 149,
        isVeg: true,
      },
    ];

    const result = await searchMenuItems('Andhra Veg Thali (Mini)', items, 5, {
      tinyFishEnabled: true,
      config: tinyFishTestConfig,
      fetchImpl: async () => {
        throw new Error('TinyFish should not run');
      },
    });

    assert.equal(result.provider, 'firestore-menu-search');
    assert.equal(result.items[0]?.name, 'Andhra Veg Thali (Mini)');
    assert.ok(result.tookMs <= 20);
  });

  it('falls back to local search when TinyFish exceeds timeout budget', async () => {
    const result = await searchMenuItems('dosa', sampleItems, 5, {
      tinyFishEnabled: true,
      config: { ...tinyFishTestConfig, timeoutMs: 50 },
      fetchImpl: async () =>
        new Promise<Response>((resolve) => {
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ results: [{ title: 'late biryani' }] }), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }),
              ),
            200,
          );
        }),
    });

    assert.equal(result.provider, 'firestore-menu-search');
    assert.equal(result.items[0]?.name, 'Masala Dosa');
    assert.ok(result.tookMs <= 120);
  });

  it('searchMenuItemsLocally matches category and description', () => {
    const items = searchMenuItemsLocally('south', sampleItems, 5);
    assert.equal(items[0]?.name, 'Masala Dosa');
  });
});
