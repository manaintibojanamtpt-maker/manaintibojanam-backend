import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mapRestaurantPublicToKitchenCard } from '../src/presentation/discovery/mapRestaurantToKitchenCard';
import type { RestaurantPublic } from '@/types/marketplace';
import {
  readOrderBhojanFile,
  readStorefrontDesignSystemFile,
} from './testPaths';

function baseRestaurant(overrides: Partial<RestaurantPublic> = {}): RestaurantPublic {
  return {
    restaurantId: 'kitchen-1',
    restaurantSlug: 'kitchen-1',
    displayName: 'Test Kitchen',
    rating: 4.5,
    ratingCount: 10,
    cuisines: ['Indian'],
    priceForTwo: 400,
    isOpen: true,
    badges: [],
    kitchenFormat: 'home_kitchen',
    ...overrides,
  };
}

describe('mapRestaurantPublicToKitchenCard distance', () => {
  it('leaves distanceKm undefined when restaurant distance is unknown', () => {
    const card = mapRestaurantPublicToKitchenCard(baseRestaurant());
    assert.equal(card.distanceKm, undefined);
  });

  it('hides sub-100m distance artifacts from mapper output', () => {
    const card = mapRestaurantPublicToKitchenCard(baseRestaurant({ distanceKm: 0.05 }));
    assert.equal(card.distanceKm, undefined);
  });

  it('preserves known distanceKm values', () => {
    const card = mapRestaurantPublicToKitchenCard(baseRestaurant({ distanceKm: 2.4 }));
    assert.equal(card.distanceKm, 2.4);
  });

  it('does not default unknown distance to zero in mapper source', () => {
    const source = readOrderBhojanFile('src/presentation/discovery/mapRestaurantToKitchenCard.ts');
    assert.doesNotMatch(source, /distanceKm:\s*restaurant\.distanceKm\s*\?\?\s*0/);
  });

  it('omits delivery fee label when fee is unknown', () => {
    const card = mapRestaurantPublicToKitchenCard(baseRestaurant());
    assert.equal(card.deliveryFeeLabel, 'Fee at checkout');
    const priced = mapRestaurantPublicToKitchenCard(baseRestaurant({ deliveryFee: 25 }));
    assert.equal(priced.deliveryFeeLabel, '₹25');
    const free = mapRestaurantPublicToKitchenCard(baseRestaurant({ deliveryFee: 0 }));
    assert.equal(free.deliveryFeeLabel, 'Free');
  });
});

describe('MarketplaceKitchenCardView distance rendering', () => {
  it('conditionally renders distance only when distanceKm is displayable', () => {
    const source = readStorefrontDesignSystemFile('marketplace/MarketplaceKitchenCard.tsx');
    assert.match(source, /showDistance/);
    assert.match(source, /isDisplayableDistanceKm/);
    assert.doesNotMatch(source, /kitchen\.distanceKm\.toFixed/);
  });
});
