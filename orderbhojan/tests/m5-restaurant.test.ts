import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildRestaurantExperiencePayload,
  buildRestaurantGallery,
  buildRestaurantHighlights,
  buildRestaurantOffers,
} from '../src/marketplace-api/mocks/restaurantExperienceMockLogic';
import { mapRestaurantPublicToExperience } from '../src/types/marketplace-restaurant';
import { MOCK_RESTAURANTS } from '../src/marketplace-api/mocks/fixtures';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M5 restaurant experience mock logic', () => {
  it('builds full experience payload without internal ids', () => {
    const payload = buildRestaurantExperiencePayload('demo-biryani-house');
    assert.equal(payload.experience.slug, 'demo-biryani-house');
    assert.ok(payload.experience.description);
    assert.ok(payload.experience.gallery.length > 0);
    assert.equal(Object.hasOwn(payload.experience, 'tenantId'), false);
    assert.equal(Object.hasOwn(payload.experience, 'branchId'), false);
    assert.ok(payload.contextToken);
  });

  it('exposes gallery, offers, and highlights endpoints', () => {
    assert.ok(buildRestaurantGallery('demo-biryani-house').images.length > 0);
    assert.ok(buildRestaurantOffers('demo-biryani-house').offers.length > 0);
    assert.ok(buildRestaurantHighlights('demo-dosa-corner').highlights.length > 0);
  });

  it('maps RestaurantPublic to experience DTO', () => {
    const mapped = mapRestaurantPublicToExperience(MOCK_RESTAURANTS[0]);
    assert.ok(mapped.restaurantId.startsWith('obr_'));
    assert.ok(mapped.slug);
    assert.equal(typeof mapped.veg, 'boolean');
  });
});

describe('M5 restaurant module structure', () => {
  const requiredFiles = [
    'src/features/restaurant/engine/restaurantExperienceLayer.ts',
    'src/features/restaurant/infrastructure/restaurantApiClient.ts',
    'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx',
    'src/types/marketplace-restaurant.ts',
    'scripts/gate-m5.mjs',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.doesNotMatch(main, /experience-restaurant\.css/);
  });

  it('routes restaurant page in fullscreen layout', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /RestaurantRoutePage/);
    assert.match(router, /restaurant\/:restaurantSlug/);
    assert.match(router, /FullScreenLayout/);
  });

  it('restaurant flag defaults OFF', () => {
    const flags = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
    assert.match(flags, /FF_OB_RESTAURANT: false/);
  });

  it('MSW handlers expose restaurant experience endpoints', () => {
    const handlers = readFileSync(join(root, 'src/marketplace-api/mocks/handlers.ts'), 'utf8');
    assert.match(handlers, /restaurants\/:slug\/gallery/);
    assert.match(handlers, /restaurants\/:slug\/offers/);
    assert.match(handlers, /restaurants\/:slug\/highlights/);
  });

  it('marketplace client exposes restaurant experience methods', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /restaurantExperience/);
    assert.match(client, /restaurantGallery/);
  });

  it('experience layer strips contextToken from UI path', () => {
    const layer = readFileSync(
      join(root, 'src/features/restaurant/engine/restaurantExperienceLayer.ts'),
      'utf8',
    );
    assert.doesNotMatch(layer, /contextToken/);
  });

  it('restaurant module does not import menu or checkout', () => {
    const page = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx'),
      'utf8',
    );
    assert.doesNotMatch(page, /getMenu/);
    assert.doesNotMatch(page, /checkout/);
    assert.doesNotMatch(page, /getMarketplaceApiClient/);
  });

  it('restaurant UX states use Founder DS marketplace view', () => {
    const states = readFileSync(
      join(root, 'src/presentation/states/restaurant/index.tsx'),
      'utf8',
    );
    assert.match(states, /MarketplaceUxStateView/);
    assert.match(states, /storefront-design-system/);
    const experience = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx'),
      'utf8',
    );
    assert.match(experience, /OrderBhojanRestaurantErrorState/);
    assert.match(experience, /OrderBhojanRestaurantClosedBanner/);
    const skeleton = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantSkeleton.tsx'),
      'utf8',
    );
    assert.match(skeleton, /RestaurantHeroSkeleton/);
  });

  it('restaurant presentation includes safe-area and reduced motion tokens', () => {
    const mibTheme = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
    const experience = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx'),
      'utf8',
    );
    assert.match(mibTheme, /prefers-reduced-motion/);
    assert.match(experience, /safe-area-inset-bottom/);
  });
});
