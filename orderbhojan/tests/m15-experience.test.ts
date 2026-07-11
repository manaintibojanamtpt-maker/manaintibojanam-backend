import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { getTimeGreeting } from '../src/features/experience/domain/experience.types';
import { FOOD_CATEGORIES, FEATURED_RESTAURANTS } from '../src/features/experience/data/mockCatalog';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M1.5 experience mock catalog', () => {
  it('defines nine food categories', () => {
    assert.equal(FOOD_CATEGORIES.length, 9);
    assert.ok(FOOD_CATEGORIES.some((c) => c.id === 'biryani'));
  });

  it('provides featured restaurant mock data', () => {
    assert.ok(FEATURED_RESTAURANTS.length >= 3);
    assert.ok(FEATURED_RESTAURANTS.every((r) => r.name && r.imageUrl));
  });
});

describe('M1.5 greeting helper', () => {
  it('returns morning greeting before noon', () => {
    assert.equal(getTimeGreeting(9), 'Good Morning');
  });

  it('returns evening greeting after 5pm', () => {
    assert.equal(getTimeGreeting(19), 'Good Evening');
  });
});

describe('M1.5 shell routes', () => {
  it('wires experience pages in AppRouter', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /HomeExperiencePage|HomePage/);
    assert.match(router, /SearchExperiencePage/);
    assert.match(router, /CartExperiencePage/);
    assert.match(router, /OrdersExperiencePage/);
  });

  it('uses five-item experience bottom navigation via OrderBhojanBottomNav', () => {
    const index = readFileSync(join(root, 'src/features/experience/index.ts'), 'utf8');
    assert.match(index, /OrderBhojanBottomNav/);
    assert.match(index, /@\/presentation\/shell/);

    const bottomNav = readFileSync(join(root, 'src/presentation/shell/OrderBhojanBottomNav.tsx'), 'utf8');
    assert.match(bottomNav, /Home/);
    assert.match(bottomNav, /Search/);
    assert.match(bottomNav, /Cart/);
    assert.match(bottomNav, /Orders/);
    assert.match(bottomNav, /Profile/);
    assert.match(bottomNav, /storefront-design-system/);
  });
});

describe('M1.5 storefront design system compliance', () => {
  const experienceFiles = [
    'src/features/experience/ui/home/HeroHeader.tsx',
    'src/features/experience/ui/shared/MarketplaceRestaurantTile.tsx',
  ];

  for (const rel of experienceFiles) {
    it(`avoids legacy primitives in ${rel}`, () => {
      const content = readFileSync(join(root, rel), 'utf8');
      assert.doesNotMatch(content, /@bhojan\/design-system/);
      assert.doesNotMatch(content, /@\/shared\/components/);
    });
  }

  it('cart experience delegates to Founder DS presentation', () => {
    const index = readFileSync(join(root, 'src/features/experience/index.ts'), 'utf8');
    assert.match(index, /OrderBhojanCartExperience/);
    assert.match(index, /@\/presentation\/cart/);
    const cart = readFileSync(join(root, 'src/presentation/cart/OrderBhojanCartExperience.tsx'), 'utf8');
    assert.match(cart, /storefront-design-system/);
    assert.doesNotMatch(cart, /@\/shared\/components/);
  });

  it('mock search page uses Founder storefront design system', () => {
    const content = readFileSync(
      join(root, 'src/features/experience/ui/search/MockSearchExperiencePage.tsx'),
      'utf8',
    );
    assert.match(content, /@bhojan\/storefront-design-system/);
    assert.match(content, /MarketplaceSearchBar/);
    assert.doesNotMatch(content, /@\/shared\/components/);
  });

  it('loads storefront styles via globals.css only', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /@\/styles\/globals\.css/);
    assert.doesNotMatch(main, /experience-/);

    const globals = readFileSync(join(root, 'src/styles/globals.css'), 'utf8');
    assert.match(globals, /design-system\/styles\/index\.css/);
  });

  it('floating cart exports OrderBhojanFloatingCart from presentation', () => {
    const index = readFileSync(join(root, 'src/features/experience/index.ts'), 'utf8');
    assert.match(index, /OrderBhojanFloatingCart/);
    assert.match(index, /@\/presentation\/shell/);
  });
});

describe('M1.5 experience boundaries', () => {
  it('does not call marketplace discover from home experience', () => {
    const home = readFileSync(join(root, 'src/features/experience/ui/home/HomeExperiencePage.tsx'), 'utf8');
    assert.doesNotMatch(home, /getMarketplaceApiClient/);
    assert.doesNotMatch(home, /discover\(/);
  });

  it('uses mock query hooks only', () => {
    const hooks = readFileSync(join(root, 'src/features/experience/hooks/useMockExperienceQuery.ts'), 'utf8');
    assert.doesNotMatch(hooks, /getMarketplaceApiClient/);
    assert.match(hooks, /delay\(/);
  });
});

describe('M1.5 BDS storybook snapshots reference', () => {
  const bdsRoot = resolve(root, '../packages/design-system');
  const storyComponents = [
    'src/components/RestaurantCard/RestaurantCard.stories.tsx',
    'src/components/Card/Card.stories.tsx',
    'src/components/Button/Button.stories.tsx',
  ];

  for (const rel of storyComponents) {
    it(`design system story exists: ${rel}`, () => {
      assert.ok(statSync(join(bdsRoot, rel)).isFile());
    });
  }
});
