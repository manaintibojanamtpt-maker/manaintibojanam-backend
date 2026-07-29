import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapSearchItemToResultCard } from '../src/presentation/search/mapSearchItemToResultCard.ts';

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
    assert.equal(card.eligibilityLabel, 'Veg Thali (South Indian Meals)');
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
