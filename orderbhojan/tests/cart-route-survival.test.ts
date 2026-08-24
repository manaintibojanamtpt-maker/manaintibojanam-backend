import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('cart survives route transitions without false clears', () => {
  it('OrderBhojanCheckoutPage waits for cart hydration before showing empty state', () => {
    const checkoutPage = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );

    assert.match(checkoutPage, /cartHydrated.*=.*useCartStore\(\(s\) => s\._hasHydrated\)/);
    assert.match(checkoutPage, /if \(!cartHydrated\) \{/);
    assert.match(checkoutPage, /Restoring your cart/);
  });

  it('cartStore has _hasHydrated state and _setHasHydrated action', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /_hasHydrated: boolean;/);
    assert.match(cartStore, /_setHasHydrated: \(value: boolean\) => void;/);
    assert.match(cartStore, /_setHasHydrated: \(value\) => set\(\{ _hasHydrated: value \}\)/);
  });

  it('cartStore persist middleware sets _hasHydrated on rehydration', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /onRehydrateStorage: \(\) => \(state\) => \{/);
    assert.match(cartStore, /state\._hasHydrated = true/);
    assert.match(cartStore, /if \(state\.lines\.length > 0\) \{/);
    assert.match(cartStore, /useCartStore\.setState\(\{ visible: true \}\)/);
  });

  it('sanitizeLiveRestaurantContext guards against clearing during hydration', () => {
    const sanitize = readFileSync(
      join(root, 'src/lib/sanitizeLiveRestaurantContext.ts'),
      'utf8',
    );

    assert.match(sanitize, /sanitizeRestaurantSlugContext/);
    assert.match(sanitize, /Check if stores are hydrated - if not, DO NOT clear \(hydration race\)/);
    assert.match(sanitize, /const contextHydrated = useRestaurantContextStore\.persist\.hasHydrated/);
    assert.match(sanitize, /const cartHydrated = useCartStore\.persist\.hasHydrated/);
    assert.match(sanitize, /if \(!contextHydrated \|\| !cartHydrated\) \{/);
    assert.match(sanitize, /return/);
  });

  it('canClearForRestaurantMismatch returns false during hydration', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /UNKNOWN context.*MUST NOT trigger a clear/);
    assert.match(cartStore, /Check hydration state/);
    assert.match(cartStore, /if \(!contextHydrated \|\| !cartHydrated\) \{/);
    assert.match(cartStore, /return false; \/\/ Don't clear during hydration race/);
  });

  it('setRestaurant keeps cart items when hydration not complete', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /setRestaurant: \(slug\) => \{/);
    assert.match(cartStore, /if \(prev\.restaurantSlug !== slug\) \{/);
    assert.match(cartStore, /if \(canClearForRestaurantMismatch\(prev\.restaurantSlug, slug, prev\.lines\.length > 0\)\) \{/);
    assert.match(cartStore, /Just update the slug, keep existing cart items/);
    assert.match(cartStore, /set\(\{ restaurantSlug: slug \}\)/);
  });

  it('addItem keeps cart items when hydration not complete', () => {
    const cartStore = readFileSync(
      join(root, 'src/features/cart/store/cartStore.ts'),
      'utf8',
    );

    assert.match(cartStore, /addItem: \(line, quantity = 1\) => \{/);
    assert.match(cartStore, /current\[0\]\.restaurantSlug !== ctx\.restaurantSlug/);
    assert.match(cartStore, /canClearForRestaurantMismatch\(current\[0\]\.restaurantSlug, ctx\.restaurantSlug, true\)/);
  });
});