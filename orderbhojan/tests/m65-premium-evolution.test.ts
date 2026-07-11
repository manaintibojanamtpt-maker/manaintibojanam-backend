import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M6.5 premium evolution layer', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const isPx2 = String(pkg.version).includes('px2');

  it('optionally retains M65 CSS artifact for historical regression', () => {
    const m65Css = join(root, 'src/styles/experience-premium-m65.css');
    if (existsSync(m65Css)) {
      assert.ok(statSync(m65Css).isFile());
    }
  });

  it('uses framer-motion premium motion utilities', () => {
    const motion = readFileSync(
      join(root, 'src/features/experience/motion/premiumMotion.tsx'),
      'utf8',
    );
    assert.match(motion, /framer-motion/);
    assert.match(motion, /MotionReveal|MotionPage/);
    assert.doesNotMatch(motion, /@bhojan\/design-system/);
  });

  it('optionally validates M65 CSS safe-area, dark mode, and reduced motion', () => {
    const m65Css = join(root, 'src/styles/experience-premium-m65.css');
    if (!existsSync(m65Css)) {
      return;
    }
    const css = readFileSync(m65Css, 'utf8');
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /data-bds-theme='dark'/);
    assert.match(css, /ob-m65-menu/);
    assert.match(css, /ob-m65-restaurant/);
    assert.match(css, /ob-m65-home/);
  });

  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.doesNotMatch(main, /experience-premium-m65\.css/);
    assert.doesNotMatch(main, /experience-checkout\.css/);
    assert.doesNotMatch(main, /experience-px2-layout\.css/);
  });

  it('home, restaurant, menu pages use milestone visual classes', () => {
    const home = readFileSync(
      join(root, 'src/features/experience/ui/home/HomeExperiencePage.tsx'),
      'utf8',
    );
    const restaurantExperience = readFileSync(
      join(root, 'src/presentation/restaurant/OrderBhojanRestaurantExperience.tsx'),
      'utf8',
    );
    const menuExperience = readFileSync(
      join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'),
      'utf8',
    );

    if (isPx2) {
      assert.match(home, /OrderBhojanHomeHero/);
      assert.match(restaurantExperience, /SoftButton/);
      assert.match(menuExperience, /OrderBhojanFoodCategoryRail/);
      assert.doesNotMatch(menuExperience, /ob-menu-px2/);
    } else {
      assert.match(home, /ob-m65-home/);
      assert.match(home, /MotionReveal/);
      assert.match(restaurantExperience, /ob-m65-restaurant/);
      const menu = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodExperience.tsx'), 'utf8');
      assert.match(menu, /ob-m65-menu/);
    }
  });

  it('food cards use Founder DS menu presentation', () => {
    const card = readFileSync(join(root, 'src/presentation/food/OrderBhojanFoodCardItem.tsx'), 'utf8');
    if (isPx2) {
      assert.match(card, /MenuItemCardView/);
      assert.match(card, /storefront-design-system/);
    } else {
      assert.match(card, /useBlurUpImage/);
      assert.match(card, /ob-food-card__ribbon/);
    }
  });

  it('does not modify routing or marketplace API', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.doesNotMatch(router, /getMarketplaceApiClient/);
    assert.match(router, /restaurant\/:restaurantSlug\/menu/);
  });

  it('package version targets active milestone', () => {
    assert.match(pkg.version, isPx2 ? /px2/ : /m65/);
    assert.ok(pkg.dependencies['framer-motion']);
  });
});
