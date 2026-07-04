import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M6.5 premium evolution layer', () => {
  it('loads M65 CSS from main entry', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /experience-premium-m65\.css/);
    statSync(join(root, 'src/styles/experience-premium-m65.css'));
  });

  it('uses framer-motion premium motion utilities', () => {
    const motion = readFileSync(
      join(root, 'src/features/experience/motion/premiumMotion.tsx'),
      'utf8',
    );
    assert.match(motion, /framer-motion/);
    assert.match(motion, /MotionReveal/);
    assert.match(motion, /useReducedMotion/);
  });

  it('M65 CSS includes safe-area, dark mode, and reduced motion', () => {
    const css = readFileSync(join(root, 'src/styles/experience-premium-m65.css'), 'utf8');
    assert.match(css, /safe-area-inset-top/);
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /data-bds-theme='dark'/);
    assert.match(css, /ob-m65-menu/);
    assert.match(css, /ob-m65-restaurant/);
    assert.match(css, /ob-m65-home/);
  });

  it('home, restaurant, menu pages use M65 visual classes', () => {
    const home = readFileSync(
      join(root, 'src/features/experience/ui/home/HomeExperiencePage.tsx'),
      'utf8',
    );
    const restaurant = readFileSync(
      join(root, 'src/features/restaurant/ui/RestaurantExperiencePage.tsx'),
      'utf8',
    );
    const menu = readFileSync(join(root, 'src/features/food/ui/FoodExperiencePage.tsx'), 'utf8');
    assert.match(home, /ob-m65-home/);
    assert.match(home, /MotionReveal/);
    assert.match(restaurant, /ob-m65-restaurant/);
    assert.match(menu, /ob-m65-menu/);
  });

  it('food cards use blur-up progressive images', () => {
    const card = readFileSync(join(root, 'src/features/food/ui/FoodCardItem.tsx'), 'utf8');
    assert.match(card, /useBlurUpImage/);
    assert.match(card, /ob-food-card__ribbon/);
  });

  it('does not modify routing or marketplace API', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.doesNotMatch(router, /getMarketplaceApiClient/);
    assert.match(router, /restaurant\/:restaurantSlug\/menu/);
  });

  it('package version targets m65', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.match(pkg.version, /m65/);
    assert.ok(pkg.dependencies['framer-motion']);
  });
});
