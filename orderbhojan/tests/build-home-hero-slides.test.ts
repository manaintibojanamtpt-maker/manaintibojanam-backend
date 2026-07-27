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

  it('keeps superadmin custom imageUrl food slides contiguous before offers', () => {
    const config = {
      ...DEFAULT_HOME_HERO_CONFIG,
      slides: DEFAULT_HOME_HERO_CONFIG.slides.map((slide, index) =>
        index === 0
          ? { ...slide, imageUrl: 'https://cdn.example.com/owner-hero-1.jpg', assetId: undefined }
          : slide,
      ),
    };
    const merged = mergeHomeHeroSlides(config, [sampleOfferRestaurant]);
    const foodIds = merged.filter((s) => s.kind === 'food').map((s) => s.id);
    assert.deepEqual(
      foodIds,
      config.slides.filter((s) => s.kind !== 'offer').map((s) => s.id),
    );
    assert.equal(merged[0]?.imageUrl, 'https://cdn.example.com/owner-hero-1.jpg');
    const firstOfferIdx = merged.findIndex((s) => s.kind === 'offer');
    assert.ok(firstOfferIdx > 0);
    assert.ok(merged.slice(0, firstOfferIdx).every((s) => s.kind === 'food'));
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
