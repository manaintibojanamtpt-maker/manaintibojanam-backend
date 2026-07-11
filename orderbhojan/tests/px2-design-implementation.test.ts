import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const forbiddenUiPatterns = [
  /\bM7\b/i,
  /Firestore UID/i,
  /mock cart/i,
  /preview shell/i,
  /ordering arrives in/i,
  /checkout arrives in/i,
  /ob-m65-/,
];

const px2Screens = [
  'src/features/experience/ui/home/HomeExperiencePage.tsx',
  'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx',
  'src/presentation/food/OrderBhojanFoodExperience.tsx',
  'src/presentation/search/OrderBhojanSearchExperience.tsx',
  'src/presentation/cart/OrderBhojanCartExperience.tsx',
  'src/presentation/profile/OrderBhojanProfilePage.tsx',
];

const requiredBdsSymbols = [
  'ImmersiveHero',
  'FoodRow',
  'NavIsland',
  'PremiumSearch',
  'RestaurantHero',
  'StickyCategoryRail',
  'MiniNavIsland',
  'FloatingCTA',
  'PremiumEmpty',
  'MotionPage',
];

describe('PX2 design-to-code implementation', () => {
  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    const globals = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.match(globals, /design-system\/styles\/index\.css/);
    assert.doesNotMatch(main, /experience-premium-m65\.css/);
    assert.doesNotMatch(main, /experience-checkout\.css/);
    assert.doesNotMatch(main, /experience-px2-layout\.css/);
  });

  it('package version targets px2', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.match(pkg.version, /px2/);
    assert.match(pkg.scripts['gate:px2'], /gate-px2\.mjs/);
  });

  it('AppProviders does not use DesignSystemProvider', () => {
    const providers = readFileSync(join(root, 'src/shared/providers/AppProviders.tsx'), 'utf8');
    assert.doesNotMatch(providers, /DesignSystemProvider/);
  });

  it('experience screens use Founder DS presentation components', () => {
    const home = readFileSync(join(root, px2Screens[0]), 'utf8');
    assert.match(home, /OrderBhojanHomeHero/);

    const hero = readFileSync(join(root, 'src/presentation/discovery/OrderBhojanHomeHero.tsx'), 'utf8');
    assert.match(hero, /MarketplaceSearchBar/);
    assert.match(hero, /storefront-design-system/);

    const restaurant = readFileSync(join(root, 'src/presentation/restaurant/OrderBhojanRestaurantHero.tsx'), 'utf8');
    assert.match(restaurant, /GlassCard/);
    assert.match(restaurant, /ProfileImage/);

    const menuExperience = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'),
      'utf8',
    );
    assert.match(menuExperience, /SectionHeader/);
    assert.match(menuExperience, /OrderBhojanFoodCategoryRail/);
    assert.doesNotMatch(menuExperience, /ob-menu-px2/);
    assert.doesNotMatch(menuExperience, /FoodRow/);

    const menuCard = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodCardItem.tsx'), 'utf8');
    assert.match(menuCard, /MenuItemCardView/);
    assert.match(menuCard, /storefront-design-system/);

    const searchPresentation = readFileSync(
      join(root, 'src/presentation/search/OrderBhojanSearchBar.tsx'),
      'utf8',
    );
    assert.match(searchPresentation, /MarketplaceSearchBar/);
    const searchExperience = readFileSync(
      join(root, 'src/presentation/search/OrderBhojanSearchExperience.tsx'),
      'utf8',
    );
    assert.match(searchExperience, /OrderBhojanSearchFiltersBar/);

    const cart = readFileSync(join(root, 'src/presentation/cart/OrderBhojanCartExperience.tsx'), 'utf8');
    assert.match(cart, /CartPageView/);
    assert.match(cart, /storefront-design-system/);

    const checkoutPresentation = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );
    assert.match(checkoutPresentation, /CheckoutPageView/);
    assert.match(checkoutPresentation, /\/orders\/\$\{orderId\}\/track/);

    const profilePresentation = readFileSync(
      join(root, 'src/presentation/profile/OrderBhojanProfilePage.tsx'),
      'utf8',
    );
    assert.match(profilePresentation, /ProfileGuestView/);
    assert.match(profilePresentation, /storefront-design-system/);
  });

  it('FoodCategoryRail uses Founder DS presentation', () => {
    const rail = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodCategoryRail.tsx'), 'utf8');
    assert.match(rail, /OrderBhojanFoodCategoryRail/);
    assert.doesNotMatch(rail, /StickyCategoryRail/);
    assert.doesNotMatch(rail, /ob-food-rail__chip/);
  });

  it('FoodCardItem uses MenuItemCardView presentation', () => {
    const card = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodCardItem.tsx'), 'utf8');
    assert.doesNotMatch(card, /FoodRow/);
    assert.doesNotMatch(card, /ob-food-card__ribbon/);
  });

  it('premium motion uses framer-motion exports', () => {
    const motion = readFileSync(join(root, 'src/features/experience/motion/premiumMotion.tsx'), 'utf8');
    assert.match(motion, /framer-motion/);
    assert.match(motion, /MotionPage/);
    assert.doesNotMatch(motion, /@bhojan\/design-system/);
  });

  it('storefront styles include reduced motion and safe-area tokens', () => {
    const mibTheme = readFileSync(join(root, 'src/styles/mib-theme.css'), 'utf8');
    const bottomNav = readFileSync(join(root, 'src/presentation/shell/OrderBhojanBottomNav.tsx'), 'utf8');
    const restaurantHero = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantHero.tsx'),
      'utf8',
    );
    assert.match(mibTheme, /prefers-reduced-motion/);
    assert.match(bottomNav, /storefront-design-system/);
    assert.match(restaurantHero, /safe-area-inset-top/);
  });

  it('BDS v1.1-px2 exports required PX2 components', () => {
    const bdsRoot = resolve(root, '../packages/design-system/src');
    const bdsComponents = readFileSync(join(bdsRoot, 'components/index.ts'), 'utf8');
    const bdsMotion = readFileSync(join(bdsRoot, 'motion/px2Motion.tsx'), 'utf8');
    const bdsBundle = `${bdsComponents}\n${bdsMotion}`;
    for (const symbol of requiredBdsSymbols) {
      assert.match(bdsBundle, new RegExp(symbol), `BDS must export ${symbol}`);
    }
  });

  it('forbidden milestone copy absent from experience UI', () => {
    const uiFiles = [
      ...px2Screens,
      'src/presentation/food/OrderBhojanFoodFloatingCart.tsx',
      'src/presentation/shell/OrderBhojanFloatingCart.tsx',
    ];

    for (const relative of uiFiles) {
      const content = readFileSync(join(root, relative), 'utf8');
      for (const pattern of forbiddenUiPatterns) {
        assert.doesNotMatch(content, pattern, `${relative} contains forbidden copy: ${pattern}`);
      }
    }
  });

  it('does not modify routing or marketplace API', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.doesNotMatch(router, /getMarketplaceApiClient/);
    assert.match(router, /restaurant\/:restaurantSlug\/menu/);
  });
});
