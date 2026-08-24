import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('cart hydration guard prevents false cross-restaurant clear', () => {
  it('cartStore has canClearForRestaurantMismatch helper that checks hydration', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /canClearForRestaurantMismatch/);
    assert.match(cartStore, /useRestaurantContextStore\.persist\.hasHydrated/);
    assert.match(cartStore, /useCartStore\.persist\.hasHydrated/);
    assert.match(cartStore, /Don't clear during hydration race/);
  });

  it('setRestaurant uses hydration guard before clearing cart', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /setRestaurant.*\(slug\).*\{/);
    assert.match(cartStore, /canClearForRestaurantMismatch\(prev\.restaurantSlug, slug, prev\.lines\.length > 0\)/);
    assert.match(cartStore, /Just update the slug, keep existing cart items/);
  });

  it('addItem uses hydration guard before clearing for mismatch', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /addItem.*\(line.*quantity.*=.*1\).*\{/);
    assert.match(cartStore, /canClearForRestaurantMismatch\(current\[0\]\.restaurantSlug, ctx\.restaurantSlug, true\)/);
  });

  it('sanitizeRestaurantSlugContext checks hydration before clearing', () => {
    const sanitize = readFileSync(
      join(root, 'src/lib/sanitizeLiveRestaurantContext.ts'),
      'utf8',
    );

    assert.match(sanitize, /sanitizeRestaurantSlugContext/);
    assert.match(sanitize, /useRestaurantContextStore\.persist\.hasHydrated/);
    assert.match(sanitize, /useCartStore\.persist\.hasHydrated/);
    assert.match(sanitize, /If either store hasn't hydrated, we cannot trust the comparison - defer/);
    assert.match(sanitize, /UNKNOWN context.*MUST NOT trigger a clear/);
  });

  it('sanitizeLiveRestaurantContext only clears when Firestore feature enabled', () => {
    const sanitize = readFileSync(
      join(root, 'src/lib/sanitizeLiveRestaurantContext.ts'),
      'utf8',
    );

    assert.match(sanitize, /sanitizeLiveRestaurantContext/);
    assert.match(sanitize, /FF_OB_FIRESTORE/);
    assert.match(sanitize, /isFeatureEnabled/);
  });
});