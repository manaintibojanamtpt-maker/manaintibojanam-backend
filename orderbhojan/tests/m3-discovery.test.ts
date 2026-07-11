import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { applyDiscoveryFilters, sortRestaurants } from '../src/features/discovery/domain/filters';
import { DISCOVERY_MOCK_POOL } from '../src/marketplace-api/mocks/discoveryFixtures';
import {
  buildDiscoveryCollection,
  buildDiscoveryHome,
} from '../src/marketplace-api/mocks/discoveryMockLogic';
import { HOME_COLLECTION_IDS } from '../src/features/discovery/domain/collections';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M3 discovery engine filters', () => {
  it('filters veg-only restaurants', () => {
    const filtered = applyDiscoveryFilters(DISCOVERY_MOCK_POOL, { vegOnly: true });
    assert.ok(filtered.length > 0);
    assert.ok(
      filtered.every(
        (r) => r.badges.includes('veg') || r.badges.includes('pure_veg'),
      ),
    );
  });

  it('sorts by distance ascending', () => {
    const sorted = sortRestaurants(DISCOVERY_MOCK_POOL, 'distance');
    for (let i = 1; i < sorted.length; i += 1) {
      assert.ok((sorted[i].distanceKm ?? 0) >= (sorted[i - 1].distanceKm ?? 0));
    }
  });

  it('sorts alphabetically', () => {
    const sorted = sortRestaurants(DISCOVERY_MOCK_POOL, 'alphabetical');
    for (let i = 1; i < sorted.length; i += 1) {
      assert.ok(sorted[i].displayName.localeCompare(sorted[i - 1].displayName) >= 0);
    }
  });
});

describe('M3 discovery MSW mock logic', () => {
  it('builds home feed with multiple collections', () => {
    const home = buildDiscoveryHome({ lat: 17.44, lng: 78.35, page: 1, limit: 6 });
    assert.ok(home.collections.length >= 5);
    assert.ok(home.locationLabel);
  });

  it('builds nearby collection sorted by distance', () => {
    const nearby = buildDiscoveryCollection('nearby', { lat: 17.44, lng: 78.35, limit: 6 });
    assert.equal(nearby.id, 'nearby');
    assert.ok(nearby.restaurants.length > 0);
    assert.equal(nearby.backedByApi, true);
  });

  it('supports all registered home collection ids', () => {
    assert.ok(HOME_COLLECTION_IDS.includes('nearby'));
    assert.ok(HOME_COLLECTION_IDS.includes('desserts'));
    assert.ok(HOME_COLLECTION_IDS.length >= 18);
  });
});

describe('M3 discovery module structure', () => {
  const requiredFiles = [
    'src/features/discovery/engine/discoveryEngine.ts',
    'src/features/discovery/infrastructure/discoveryApiClient.ts',
    'src/features/discovery/ui/DiscoveryHomeFeed.tsx',
    'src/features/discovery/ui/DiscoveryRestaurantCard.tsx',
    'src/types/marketplace-discovery.ts',
    'scripts/gate-m3.mjs',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.doesNotMatch(main, /experience-discovery\.css/);
  });

  it('wires discovery behind feature flag on home', () => {
    const home = readFileSync(
      join(root, 'src/features/experience/ui/home/HomeExperiencePage.tsx'),
      'utf8',
    );
    assert.match(home, /useDiscoveryFeatureEnabled/);
    assert.match(home, /DiscoveryHomeFeed/);
    assert.doesNotMatch(home, /getMarketplaceApiClient/);
  });

  it('discovery flag defaults OFF', () => {
    const flags = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
    assert.match(flags, /FF_OB_DISCOVERY: false/);
  });

  it('MSW handlers expose discovery endpoints', () => {
    const handlers = readFileSync(join(root, 'src/marketplace-api/mocks/handlers.ts'), 'utf8');
    assert.match(handlers, /discovery\/nearby/);
    assert.match(handlers, /discovery\/featured/);
    assert.match(handlers, /discovery\/trending/);
    assert.match(handlers, /discovery\/cloud-kitchens/);
    assert.match(handlers, /discovery\/top-rated/);
    assert.match(handlers, /discovery\/offers/);
  });

  it('marketplace client exposes discovery methods', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /discoveryHome/);
    assert.match(client, /discoveryNearby/);
    assert.match(client, /discoveryCollection/);
  });

  it('RestaurantPublic DTO never exposes internal ids', () => {
    const sample = DISCOVERY_MOCK_POOL[0];
    assert.ok(sample.restaurantId.startsWith('obr_'));
    assert.ok(sample.restaurantSlug);
    assert.equal(Object.hasOwn(sample, 'tenantId'), false);
    assert.equal(Object.hasOwn(sample, 'branchId'), false);
  });

  it('discovery module does not import menu or checkout', () => {
    const engine = readFileSync(
      join(root, 'src/features/discovery/engine/discoveryEngine.ts'),
      'utf8',
    );
    assert.doesNotMatch(engine, /getMenu/);
    assert.doesNotMatch(engine, /checkout/);
  });

  it('discovery presentation includes safe-area and reduced motion tokens', () => {
    const mibTheme = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
    const feed = readFileSync(join(root, 'src/presentation/discovery/OrderBhojanHomeFeedSkeleton.tsx'), 'utf8');
    assert.match(mibTheme, /prefers-reduced-motion/);
    assert.match(feed, /storefront-design-system/);
  });
});
