import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_CATEGORY_DISCOVERY_CUISINES,
  isHomeCategoryDiscoveryFilterActive,
  restaurantMatchesDiscoveryCuisineFilter,
  toggleHomeCategoryDiscoveryFilter,
} from '../src/features/discovery/domain/homeCategoryCuisine';

describe('homeCategoryCuisine discovery filters', () => {
  it('maps browse chips to discovery cuisine labels', () => {
    assert.equal(HOME_CATEGORY_DISCOVERY_CUISINES.biryani, 'Biryani');
    assert.equal(HOME_CATEGORY_DISCOVERY_CUISINES['south-indian'], 'South Indian');
  });

  it('toggles cuisine filter on and off', () => {
    assert.equal(isHomeCategoryDiscoveryFilterActive('biryani', undefined), false);
    const next = toggleHomeCategoryDiscoveryFilter('biryani', undefined);
    assert.deepEqual(next, ['Biryani']);
    assert.equal(isHomeCategoryDiscoveryFilterActive('biryani', next), true);
    assert.equal(toggleHomeCategoryDiscoveryFilter('biryani', next), undefined);
  });

  it('matches cuisines case-insensitively', () => {
    assert.equal(isHomeCategoryDiscoveryFilterActive('meals', ['meals']), true);
    assert.equal(isHomeCategoryDiscoveryFilterActive('pizza', ['PIZZA']), true);
  });

  it('matches owner cuisine tags via aliases (Biryani chip → Hyderabadi kitchens)', () => {
    assert.equal(
      restaurantMatchesDiscoveryCuisineFilter(['Hyderabadi'], ['Biryani']),
      true,
    );
    assert.equal(
      restaurantMatchesDiscoveryCuisineFilter(['Dosa', 'South Indian'], ['South Indian']),
      true,
    );
    assert.equal(
      restaurantMatchesDiscoveryCuisineFilter(['Chinese'], ['Biryani']),
      false,
    );
  });
});
