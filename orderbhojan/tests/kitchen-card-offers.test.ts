import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RestaurantPublic } from '../src/types/marketplace';
import { mapRestaurantPublicToKitchenCard } from '../src/presentation/discovery/mapRestaurantToKitchenCard';

function baseRestaurant(overrides: Partial<RestaurantPublic> = {}): RestaurantPublic {
  return {
    restaurantId: 'obr_test',
    restaurantSlug: 'test-kitchen',
    displayName: 'Test Kitchen',
    cuisines: ['Biryani'],
    isOpen: true,
    badges: ['offer'],
    kitchenFormat: 'home_kitchen',
    ...overrides,
  };
}

describe('mapRestaurantPublicToKitchenCard offers', () => {
  it('shows owner offer copy on kitchen cards instead of generic Offer', () => {
    const card = mapRestaurantPublicToKitchenCard(
      baseRestaurant({ offer: 'Diwali 20% off' }),
    );
    const offerBadge = card.badges.find((badge) => badge.id === 'offer');
    assert.equal(offerBadge?.label, 'Diwali 20% off');
  });

  it('falls back to Offer when badge exists without copy', () => {
    const card = mapRestaurantPublicToKitchenCard(baseRestaurant());
    const offerBadge = card.badges.find((badge) => badge.id === 'offer');
    assert.equal(offerBadge?.label, 'Offer');
  });
});
