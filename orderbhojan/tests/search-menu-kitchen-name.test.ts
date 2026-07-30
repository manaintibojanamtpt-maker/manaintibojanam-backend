import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapSearchItemToResultCard } from '../src/presentation/search/mapSearchItemToResultCard.ts';
import {
  readOrderBhojanFile,
  readStorefrontDesignSystemFile,
} from './testPaths';

describe('menu search kitchen name', () => {
  it('surfaces restaurantName as the secondary kitchen line for food hits', () => {
    const card = mapSearchItemToResultCard({
      id: 'food_1',
      type: 'food',
      label: 'Andhra Veg Thali (Mini)',
      subtitle: "Lucky's Kitchen",
      slug: 'lucky-s-kitchen',
      meta: {
        price: 149,
        isVeg: true,
        restaurantName: "Lucky's Kitchen",
        category: 'Veg Thali (South Indian Meals)',
      },
    });

    assert.equal(card.name, 'Andhra Veg Thali (Mini)');
    assert.equal(card.cuisineLabel, "Lucky's Kitchen");
    assert.equal(card.eligibilityLabel, 'Veg Thali (South Indian Meals) · ₹149');
    assert.doesNotMatch(card.eligibilityLabel, /^food$/i);
  });

  it('falls back to slug title-case when kitchen metadata is missing', () => {
    const card = mapSearchItemToResultCard({
      id: 'food_2',
      type: 'food',
      label: 'Chicken Biryani',
      slug: 'spice-route-kitchen',
      meta: { price: 220, isVeg: false },
    });

    assert.equal(card.cuisineLabel, 'Spice Route Kitchen');
  });
});

describe('menu search result metadata polish', () => {
  it('omits distance when meta.distanceKm is missing (no misleading 0.0 km)', () => {
    const card = mapSearchItemToResultCard({
      id: 'food_3',
      type: 'food',
      label: 'Ragi Mudda',
      subtitle: "Lucky's Kitchen",
      slug: 'lucky-s-kitchen',
      meta: {
        price: 99,
        restaurantName: "Lucky's Kitchen",
        category: 'Millets',
      },
    });

    assert.equal(card.distanceKm, undefined);
  });

  it('hides sub-100m distance artifacts and keeps real distances', () => {
    const artifact = mapSearchItemToResultCard({
      id: 'food_4',
      type: 'food',
      label: 'Curd Rice',
      slug: 'lucky-s-kitchen',
      meta: { distanceKm: 0.05, restaurantName: "Lucky's Kitchen", category: 'Rice' },
    });
    assert.equal(artifact.distanceKm, undefined);

    const known = mapSearchItemToResultCard({
      id: 'food_5',
      type: 'food',
      label: 'Curd Rice',
      slug: 'lucky-s-kitchen',
      meta: { distanceKm: 2.4, restaurantName: "Lucky's Kitchen", category: 'Rice' },
    });
    assert.equal(known.distanceKm, 2.4);
  });

  it('does not repeat kitchen name in highlights when cuisineLabel already shows it', () => {
    const card = mapSearchItemToResultCard({
      id: 'food_6',
      type: 'food',
      label: 'Pesarattu',
      subtitle: "Lucky's Kitchen",
      slug: 'lucky-s-kitchen',
      meta: {
        restaurantName: "Lucky's Kitchen",
        category: 'Tiffin',
        price: 80,
      },
    });

    assert.equal(card.cuisineLabel, "Lucky's Kitchen");
    assert.deepEqual(card.highlights, []);
  });

  it('keeps category-only eligibility when price is absent', () => {
    const card = mapSearchItemToResultCard({
      id: 'food_7',
      type: 'food',
      label: 'Sambar',
      slug: 'lucky-s-kitchen',
      meta: {
        restaurantName: "Lucky's Kitchen",
        category: 'Sides',
      },
    });

    assert.equal(card.eligibilityLabel, 'Sides');
  });

  it('mapper source never defaults unknown distance to zero', () => {
    const source = readOrderBhojanFile('src/presentation/search/mapSearchItemToResultCard.ts');
    assert.doesNotMatch(source, /distanceKm:\s*typeof[\s\S]*:\s*0/);
    assert.match(source, /isDisplayableDistanceKm/);
  });

  it('search result card view only renders distance when displayable', () => {
    const source = readStorefrontDesignSystemFile('marketplace/MarketplaceSearchResultCard.tsx');
    assert.match(source, /isDisplayableDistanceKm\(result\.distanceKm\) \?/);
    assert.match(source, /: null\}/);
    // Must not always render the pin+distance span unconditionally before ETA.
    assert.doesNotMatch(
      source,
      /text-white\/60">\s*<span className="inline-flex items-center gap-1">\s*<MapPin/,
    );
  });
});
