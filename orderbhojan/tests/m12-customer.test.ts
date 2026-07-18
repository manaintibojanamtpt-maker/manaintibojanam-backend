import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M12 customer surfaces', () => {
  const requiredFiles = [
    'src/presentation/favorites/OrderBhojanFavoritesPage.tsx',
    'src/presentation/notifications/OrderBhojanNotificationsPage.tsx',
    'src/features/cart/hooks/useCartValidation.ts',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('router wires favorites and notifications pages', () => {
    const router = readFileSync(join(root, 'src/app/routes/AppRouter.tsx'), 'utf8');
    assert.match(router, /FavoritesPage/);
    assert.match(router, /NotificationsPage/);
    assert.doesNotMatch(router, /FeaturePlaceholderPage/);
  });

  it('marketplace client exposes validateCart and favorites', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /validateCart/);
    assert.match(client, /listFavorites/);
    assert.match(client, /registerNotificationToken/);
  });

  it('cart page navigates to checkout without blocking validate', () => {
    const cart = readFileSync(join(root, 'src/presentation/cart/OrderBhojanCartExperience.tsx'), 'utf8');
    assert.match(cart, /useCartValidation/);
    assert.match(cart, /navigate\(['"]\/checkout['"]\)/);
    assert.doesNotMatch(cart, /await validate\(\)/);
  });
});
