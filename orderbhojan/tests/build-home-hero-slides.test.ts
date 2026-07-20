import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_HOME_HERO_CONFIG } from '../src/features/experience/data/kitchenHeroScenes';
import {
  discoveryRestaurantsToHeroOfferSlides,
  mergeHomeHeroSlides,
} from '../src/features/experience/utils/buildHomeHeroSlides';
import type { RestaurantPublic } from '../src/types/marketplace';

const sampleOfferRestaurant: RestaurantPublic = {
  restaurantId: 'obr_test',
  restaurantSlug: 'test-kitchen',
  displayName: 'Test Kitchen',
  coverUrl: 'https://example.com/cover.jpg',
  cuisines: ['Indian'],
  isOpen: true,
  badges: ['offer'],
  kitchenFormat: 'home_kitchen',
  offer: 'Flat 30% off',
};

describe('buildHomeHeroSlides', () => {
  it('interleaves food slides with discovery offer slides', () => {
    const merged = mergeHomeHeroSlides(DEFAULT_HOME_HERO_CONFIG, [sampleOfferRestaurant]);
    assert.ok(merged.length >= 4);
    assert.equal(merged[0]?.kind, 'food');
    assert.equal(merged[1]?.kind, 'offer');
    assert.equal(merged[1]?.headline, 'Flat 30% off');
    assert.equal(merged[1]?.subline, 'Test Kitchen — order before it ends');
    assert.equal(merged[1]?.cta, 'Order now');
    assert.equal(merged[1]?.ctaPath, '/restaurant/test-kitchen');
  });

  it('respects includeDiscoveryOffers=false', () => {
    const merged = mergeHomeHeroSlides(
      { ...DEFAULT_HOME_HERO_CONFIG, includeDiscoveryOffers: false },
      [sampleOfferRestaurant],
    );
    assert.ok(merged.every((slide) => slide.kind !== 'offer'));
  });

  it('maps restaurants with offer labels into hero offer slides', () => {
    const slides = discoveryRestaurantsToHeroOfferSlides([sampleOfferRestaurant], 2);
    assert.equal(slides.length, 1);
    assert.equal(slides[0]?.offerBadge, 'Flat 30% off');
  });
});
