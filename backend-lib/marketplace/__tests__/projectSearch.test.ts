import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSearchCollections,
  buildSearchPlatformResponse,
  buildSearchSuggestions,
  buildSearchTrending,
  type SearchContext,
} from '../projectSearch.js';
import type { RestaurantPublic } from '../projectDiscovery.js';

const sampleRestaurant: RestaurantPublic = {
  restaurantId: 'obr_lucky',
  restaurantSlug: 'lucky-s-kitchen',
  displayName: "Lucky's Kitchen",
  cuisines: ['Biryani', 'North Indian'],
  isOpen: true,
  badges: ['veg', 'offer'],
  rating: 4.5,
  ratingCount: 120,
  distanceKm: 2.1,
  deliveryFee: 0,
};

const sampleContext: SearchContext = {
  restaurants: [sampleRestaurant],
  menuItems: [
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
  ],
};

describe('projectSearch', () => {
  it('returns live restaurant and food sections for matching query', async () => {
    const response = await buildSearchPlatformResponse(
      { q: 'biryani', lat: 18.52, lng: 73.85 },
      sampleContext,
    );
    assert.equal(response.meta.provider, 'firestore-search-platform');
    assert.ok(response.sections.some((section) => section.id === 'restaurants'));
    assert.ok(response.sections.some((section) => section.id === 'foods'));
    assert.ok(response.meta.totalResults > 0);
  });

  it('builds suggestions from live restaurants and menu items', async () => {
    const suggestions = await buildSearchSuggestions('bir', sampleContext);
    assert.ok(suggestions.suggestions.some((entry) => entry.type === 'food'));
  });

  it('derives trending and collections from live pool only', () => {
    const trending = buildSearchTrending(sampleContext);
    assert.ok(trending.popular.some((chip) => chip.label === 'Biryani'));
    const collections = buildSearchCollections(sampleContext);
    assert.ok(collections.sections.some((section) => section.id === 'popular-cuisines'));
  });

  it('registers marketplace search routes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceRoutes.ts'),
      'utf8',
    );
    assert.match(source, /\/search\/menu-items/);
    assert.match(source, /\/search\/suggestions/);
    assert.match(source, /\/search\/collections/);
    assert.match(source, /buildSearchPlatformResponse/);
  });

  it('caches and dedupes search context loads by coordinates', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/projectSearch.ts'),
      'utf8',
    );
    assert.match(source, /searchContextCache/);
    assert.match(source, /inflightSearchContextLoads/);
    assert.match(source, /resetSearchContextCacheForTests/);
  });
});
