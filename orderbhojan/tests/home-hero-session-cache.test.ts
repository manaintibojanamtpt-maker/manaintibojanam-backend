import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';
import {
  readHomeHeroSessionCache,
  writeHomeHeroSessionCache,
  seedHomeHeroQueryCacheFromSession,
} from '../src/features/experience/data/homeHeroSessionCache.ts';
import type { HomeHeroConfig } from '../src/types/marketplace-home-hero.ts';

const STORAGE_KEY = 'ob-home-hero-v1';

const sample: HomeHeroConfig = {
  eyebrow: 'Home kitchens',
  headline: 'Craving?',
  rotationIntervalMs: 12_000,
  includeDiscoveryOffers: true,
  maxOfferSlides: 2,
  slides: [
    {
      id: 'custom-1',
      kind: 'food',
      subline: 'Owner uploaded hero',
      imageAlt: 'Custom plate',
      imageUrl: 'https://cdn.example.com/owner-hero.jpg',
    },
  ],
};

describe('homeHeroSessionCache', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value);
      },
      removeItem: (key: string) => {
        memory.delete(key);
      },
      clear: () => memory.clear(),
      key: () => null,
      get length() {
        return memory.size;
      },
    };
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
  });

  it('persists and restores superadmin hero slides', () => {
    const fetchedAt = Date.now();
    writeHomeHeroSessionCache(sample, fetchedAt);
    const cached = readHomeHeroSessionCache();
    assert.ok(cached);
    assert.equal(cached.config.slides[0]?.imageUrl, 'https://cdn.example.com/owner-hero.jpg');
    assert.equal(cached.fetchedAt, fetchedAt);
  });

  it('rejects empty / invalid payloads', () => {
    memory.set(STORAGE_KEY, JSON.stringify({ config: { slides: [] }, fetchedAt: Date.now() }));
    assert.equal(readHomeHeroSessionCache(), null);
  });

  it('seeds query client from session cache', () => {
    writeHomeHeroSessionCache(sample, Date.now());
    let seeded: HomeHeroConfig | null = null;
    let updatedAt: number | undefined;
    const ok = seedHomeHeroQueryCacheFromSession((key, data, options) => {
      assert.deepEqual(key, ['marketplace', 'platform', 'home-hero']);
      seeded = data;
      updatedAt = options?.updatedAt;
    }, ['marketplace', 'platform', 'home-hero']);
    assert.equal(ok, true);
    assert.equal(seeded?.slides[0]?.id, 'custom-1');
    assert.ok(typeof updatedAt === 'number');
  });
});
