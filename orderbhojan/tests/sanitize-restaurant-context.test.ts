import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach } from 'node:test';
import {
  RESTAURANT_SLUG_MISMATCH_TOAST,
  sanitizeRestaurantSlugContext,
} from '../src/lib/sanitizeLiveRestaurantContext';
import { registerToastHandler } from '../src/shared/providers/BdsToastProvider';
import { useRestaurantContextStore } from '../src/features/restaurant/store/restaurantContextStore';
import { useCartStore } from '../src/features/cart/store/cartStore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('sanitizeRestaurantSlugContext', () => {
  beforeEach(() => {
    useRestaurantContextStore.getState().clear();
    useCartStore.getState().clear();
    useCartStore.setState({ restaurantSlug: null, visible: false });
  });

  it('clears mismatched persisted context and cart with warning toast', () => {
    const toasts: string[] = [];
    registerToastHandler((message) => {
      toasts.push(message);
    });

    useRestaurantContextStore.getState().setContext({
        restaurantSlug: 'demo-biryani-house',
        contextToken: 'ctx_a',
        restaurantId: 'obr_demo_biryani_001',
      });
      useCartStore.setState({
        restaurantSlug: 'demo-biryani-house',
        lines: [
          {
            lineId: 'food-1',
            foodId: 'food-1',
            name: 'Biryani',
            price: 199,
            quantity: 1,
            restaurantSlug: 'demo-biryani-house',
            restaurantId: 'obr_demo_biryani_001',
          },
        ],
      });

      sanitizeRestaurantSlugContext('demo-dosa-corner');

      assert.equal(useRestaurantContextStore.getState().restaurantSlug, null);
      assert.equal(useCartStore.getState().lines.length, 0);
      assert.ok(toasts.includes(RESTAURANT_SLUG_MISMATCH_TOAST));
  });

  it('no-ops when route slug matches persisted context', () => {
    useRestaurantContextStore.getState().setContext({
      restaurantSlug: 'demo-biryani-house',
      contextToken: 'ctx_a',
      restaurantId: 'obr_demo_biryani_001',
    });

    sanitizeRestaurantSlugContext('demo-biryani-house');

    assert.equal(
      useRestaurantContextStore.getState().restaurantSlug,
      'demo-biryani-house',
    );
  });

  it('clears persisted promo codes when restaurant context changes', () => {
    useRestaurantContextStore.getState().setContext({
      restaurantSlug: 'mana-inti',
      contextToken: 'ctx_a',
      restaurantId: 'obr_mana-inti',
    });
    useRestaurantContextStore.getState().setPromoContext({
      promoCodes: [{ id: 'c1', code: 'MIB20', discountLabel: '20% off', minOrder: 499 }],
    });
    useRestaurantContextStore.getState().setAppliedCouponCode('MIB20');

    useRestaurantContextStore.getState().setContext({
      restaurantSlug: 'inti-bhojanam-pune',
      contextToken: 'ctx_b',
      restaurantId: 'obr_inti-bhojanam-pune',
    });

    assert.equal(useRestaurantContextStore.getState().availablePromoCodes.length, 0);
    assert.equal(useRestaurantContextStore.getState().appliedCouponCode, null);
  });
});

describe('recovery-01 discovery copy', () => {
  it('home feed surfaces pan-India fallback messaging when location is unset', () => {
    const feed = readFileSync(
      join(root, 'src/features/discovery/ui/DiscoveryHomeFeed.tsx'),
      'utf8',
    );
    assert.match(feed, /DEFAULT_MARKETPLACE_CITY_LABEL/);
    assert.match(feed, /DEFAULT_LOCATION_DISCOVERY_HINT/);
    assert.match(feed, /DEFAULT_LOCATION_DISCOVERY_CTA/);
    assert.match(feed, /Set your location/);
    assert.doesNotMatch(feed, /primaryLabel="Show all kitchens"/);
  });

  it('location bar keeps LocationChip clickable when active location is missing', () => {
    const bar = readFileSync(
      join(root, 'src/presentation/discovery/OrderBhojanHomeLocationBar.tsx'),
      'utf8',
    );
    assert.match(bar, /locationEnabled \?/);
    assert.match(bar, /<LocationChip/);
    assert.doesNotMatch(bar, /until you set your location/);
  });

  it('checkout address card uses a single clickable control', () => {
    const checkout = readFileSync(
      join(root, 'src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );
    const pageView = readFileSync(
      resolve(root, '../src/design-system/cart/CheckoutPageView.tsx'),
      'utf8',
    );
    const deliveryView = readFileSync(
      resolve(root, '../src/design-system/cart/CheckoutDeliveryAddressView.tsx'),
      'utf8',
    );
    assert.match(checkout, /openSelector/);
    assert.match(pageView, /<button[\s\S]*onClick=\{onAddressAction\}/);
    assert.doesNotMatch(deliveryView, /<SoftButton/);
    assert.doesNotMatch(deliveryView, /<button/);
  });
});
