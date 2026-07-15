import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { DiscoveryCollection } from '@/types/marketplace-discovery';
import type { RestaurantPublic } from '@/types/marketplace';
import {
  buildDiscoverySpotlightFeed,
  collectUniqueRestaurants,
  resolveHomeSpotlightMode,
} from '../src/features/experience/utils/homeSpotlightFeed.ts';

function mockRestaurant(id: string): RestaurantPublic {
  return {
    restaurantId: id,
    restaurantSlug: id,
    displayName: id,
    rating: 4.5,
    ratingCount: 10,
    cuisines: ['Indian'],
    priceForTwo: 400,
    distanceKm: 2,
    etaMinutes: { min: 20, max: 30 },
    deliveryFee: 20,
    isOpen: true,
    badges: [],
    kitchenFormat: 'home_kitchen',
  } as RestaurantPublic;
}

function mockCollection(id: DiscoveryCollection['id'], ids: string[]): DiscoveryCollection {
  return {
    id,
    title: id,
    restaurants: ids.map(mockRestaurant),
    backedByApi: false,
  };
}

describe('homeSpotlightFeed', () => {
  it('resolves spotlight modes by unique kitchen count', () => {
    assert.equal(resolveHomeSpotlightMode(1), 'single');
    assert.equal(resolveHomeSpotlightMode(2), 'dual');
    assert.equal(resolveHomeSpotlightMode(4), 'sparse');
    assert.equal(resolveHomeSpotlightMode(6), 'full');
  });

  it('dedupes restaurants across collections', () => {
    const collections = [
      mockCollection('nearby', ['a', 'b']),
      mockCollection('top-rated', ['b', 'c']),
    ];
    assert.equal(collectUniqueRestaurants(collections).length, 3);
  });

  it('uses single spotlight mode for one kitchen', () => {
    const plan = buildDiscoverySpotlightFeed([mockCollection('nearby', ['solo'])]);
    assert.equal(plan.mode, 'single');
    assert.equal(plan.spotlightRestaurant?.restaurantId, 'solo');
    assert.equal(plan.kitchenCollections.length, 0);
    assert.ok(plan.sparseCopy);
  });

  it('limits sparse mode to two restaurant rails', () => {
    const collections = [
      mockCollection('nearby', ['a', 'b']),
      mockCollection('top-rated', ['b', 'c']),
      mockCollection('featured', ['c', 'd']),
      mockCollection('trending', ['a']),
    ];
    const plan = buildDiscoverySpotlightFeed(collections);
    assert.equal(plan.mode, 'sparse');
    assert.equal(plan.kitchenCollections.filter((c) => c.id !== 'trending').length, 2);
  });

  it('drops collection rails that repeat the same kitchen list', () => {
    const collections = [
      mockCollection('nearby', ['a', 'b', 'c']),
      mockCollection('breakfast', ['a', 'b', 'c']),
      mockCollection('top-rated', ['d']),
    ];
    const plan = buildDiscoverySpotlightFeed(collections);
    assert.equal(plan.mode, 'sparse');
    assert.equal(plan.kitchenCollections.length, 2);
    assert.equal(plan.kitchenCollections[0]?.id, 'nearby');
    assert.equal(plan.kitchenCollections[1]?.id, 'top-rated');
  });
});
