import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildFoodBestsellers,
  buildFoodCategories,
  buildFoodMenu,
  buildFoodMenuPayload,
  buildFoodRecommended,
} from '../src/marketplace-api/mocks/foodExperienceMockLogic';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M6 food experience mock logic', () => {
  it('builds menu payload with public food fields only', () => {
    const payload = buildFoodMenuPayload('demo-biryani-house');
    assert.equal(payload.slug, 'demo-biryani-house');
    assert.ok(payload.items.length > 0);
    assert.ok(payload.contextToken);
    const item = payload.items[0];
    assert.ok(item.foodId);
    assert.ok(item.slug);
    assert.equal(Object.hasOwn(item, 'tenantId'), false);
    assert.equal(Object.hasOwn(item, 'branchId'), false);
  });

  it('exposes categories, recommended, and bestsellers endpoints', () => {
    assert.ok(buildFoodCategories('demo-biryani-house').categories.length > 0);
    assert.ok(buildFoodRecommended('demo-dosa-corner').items.length > 0);
    assert.ok(buildFoodBestsellers('demo-biryani-house').items.length > 0);
  });

  it('includes variants and addons on menu items', () => {
    const menu = buildFoodMenu('demo-biryani-house');
    const biryani = menu.items.find((item) => item.slug === 'hyderabadi-chicken-biryani');
    assert.ok(biryani);
    assert.ok(biryani!.variants.length > 0);
    assert.ok(biryani!.addons.length > 0);
  });
});

describe('M6 food module structure', () => {
  const requiredFiles = [
    'src/features/food/engine/foodExperienceLayer.ts',
    'src/features/food/infrastructure/foodApiClient.ts',
    'src/presentation/food/OrderBhojanFoodExperience.tsx',
    'src/types/marketplace-food.ts',
    'scripts/gate-m6.mjs',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.doesNotMatch(main, /experience-food\.css/);
  });

  it('routes food menu page in fullscreen layout', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /FoodRoutePage/);
    assert.match(router, /restaurant\/:restaurantSlug\/menu/);
    assert.match(router, /FullScreenLayout/);
  });

  it('menu flag defaults OFF', () => {
    const flags = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
    assert.match(flags, /FF_OB_MENU: false/);
  });

  it('MSW handlers expose food menu endpoints', () => {
    const handlers = readFileSync(join(root, 'src/marketplace-api/mocks/handlers.ts'), 'utf8');
    assert.match(handlers, /restaurants\/:slug\/menu/);
    assert.match(handlers, /restaurants\/:slug\/categories/);
    assert.match(handlers, /restaurants\/:slug\/recommended/);
    assert.match(handlers, /restaurants\/:slug\/bestsellers/);
  });

  it('marketplace client exposes food menu methods', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /foodMenu/);
    assert.match(client, /foodCategories/);
    assert.match(client, /foodRecommended/);
    assert.match(client, /foodBestsellers/);
  });

  it('experience layer strips contextToken from menu response', () => {
    const layer = readFileSync(
      join(root, 'src/features/food/engine/foodExperienceLayer.ts'),
      'utf8',
    );
    assert.match(layer, /stripInternal/);
    assert.match(layer, /useRestaurantContextStore/);
    assert.doesNotMatch(layer, /stripInternal[\s\S]*contextToken/);
  });

  it('menu presentation uses Founder DS adapters', () => {
    const experience = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'),
      'utf8',
    );
    assert.match(experience, /storefront-design-system/);
    assert.match(experience, /useFoodMenu/);
    assert.doesNotMatch(experience, /getMarketplaceApiClient/);
    assert.doesNotMatch(experience, /FoodRow/);
  });

  it('food customize sheet uses Founder DS BottomSheet', () => {
    const sheet = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodCustomizeSheet.tsx'), 'utf8');
    assert.match(sheet, /storefront-design-system\/layout\/BottomSheet/);
    assert.match(sheet, /FoodCustomizationPanelView/);
    assert.doesNotMatch(sheet, /@bhojan\/design-system/);
  });

  it('food presentation does not import marketplace client directly', () => {
    const page = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'), 'utf8');
    assert.doesNotMatch(page, /getMarketplaceApiClient/);
    assert.doesNotMatch(page, /checkout/);
  });

  it('menu UX states use Founder DS skeletons and error states', () => {
    const skeleton = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodMenuSkeleton.tsx'),
      'utf8',
    );
    assert.match(skeleton, /RestaurantMenuPageSkeleton/);
    const experience = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'),
      'utf8',
    );
    assert.match(experience, /OrderBhojanMenuErrorState/);
    assert.match(experience, /OrderBhojanMenuEmptyState/);
    assert.doesNotMatch(experience, /@bhojan\/design-system/);
  });

  it('food presentation includes safe-area and reduced motion tokens', () => {
    const mibTheme = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
    const floatingCart = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodFloatingCart.tsx'),
      'utf8',
    );
    assert.match(mibTheme, /prefers-reduced-motion/);
    assert.match(floatingCart, /safe-area-inset-bottom/);
  });

  it('restaurant page wires Open Menu when M6 flag enabled', () => {
    const page = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx'),
      'utf8',
    );
    assert.match(page, /useFoodFeatureEnabled/);
    assert.match(page, /\/menu/);
  });
});
