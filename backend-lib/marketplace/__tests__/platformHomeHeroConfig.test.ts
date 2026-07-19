import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_PLATFORM_HOME_HERO,
  mergePlatformHomeHeroConfig,
  sanitizePlatformHomeHeroConfig,
} from '../platformHomeHeroConfig.js';

describe('platformHomeHeroConfig', () => {
  it('defaults to pan-India English copy without regional Hindi strings', () => {
    assert.doesNotMatch(DEFAULT_PLATFORM_HOME_HERO.headline, /ghar ka khana/i);
    assert.match(DEFAULT_PLATFORM_HOME_HERO.headline, /craving tonight/i);
    assert.match(DEFAULT_PLATFORM_HOME_HERO.eyebrow, /delivered hot/i);
    assert.equal(DEFAULT_PLATFORM_HOME_HERO.rotationIntervalMs, 12_000);
    assert.equal(DEFAULT_PLATFORM_HOME_HERO.slides.length, 3);
  });

  it('sanitizes valid super-admin payload', () => {
    const config = sanitizePlatformHomeHeroConfig({
      eyebrow: 'OrderBhojan',
      headline: 'Order now',
      rotationIntervalMs: 9000,
      slides: [
        {
          id: 'slide-1',
          subline: 'Hot pizza in 30 minutes',
          imageAlt: 'Wood-fired pizza',
          imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
          cta: 'Order pizza',
          ctaPath: '/search?q=pizza',
        },
      ],
    });
    assert.equal(config.slides.length, 1);
    assert.equal(config.rotationIntervalMs, 9000);
    assert.equal(config.slides[0]?.ctaPath, '/search?q=pizza');
  });

  it('rejects owner-style invalid image URLs', () => {
    assert.throws(() =>
      sanitizePlatformHomeHeroConfig({
        eyebrow: 'OrderBhojan',
        headline: 'Order now',
        rotationIntervalMs: 9000,
        slides: [
          {
            id: 'bad',
            subline: 'Test',
            imageAlt: 'Test',
            imageUrl: 'javascript:alert(1)',
          },
        ],
      }),
    );
  });

  it('falls back to defaults for malformed stored config', () => {
    const merged = mergePlatformHomeHeroConfig({ slides: [] });
    assert.equal(merged.headline, DEFAULT_PLATFORM_HOME_HERO.headline);
  });
});
