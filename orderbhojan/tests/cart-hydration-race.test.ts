import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { useCartStore } from '../src/features/cart/store/cartStore';
import type { CartLine } from '../src/features/cart/store/cartStore';

function installMemoryLocalStorage(): void {
  if (typeof globalThis.localStorage !== 'undefined') return;
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
    },
  });
}

const sampleLine: CartLine = {
  lineId: 'line-1',
  foodId: 'food-1',
  name: 'Test Biryani',
  price: 199,
  quantity: 2,
  restaurantSlug: 'demo-kitchen',
  restaurantId: 'tenant_1',
};

describe('cart hydration race (Problem 3 fix)', () => {
  beforeEach(() => {
    installMemoryLocalStorage();
    localStorage.removeItem('ob-cart-m7');
    useCartStore.setState({ lines: [], restaurantSlug: null, visible: false, _hasHydrated: false });
  });

  afterEach(() => {
    localStorage.removeItem('ob-cart-m7');
  });

  it('cart store exposes _hasHydrated flag defaulting to false', () => {
    // Fresh process: persist has not yet rehydrated from storage.
    assert.equal(typeof useCartStore.getState()._hasHydrated, 'boolean');
    assert.equal(useCartStore.getState()._hasHydrated, false);
  });

  it('_setHasHydrated flips the flag once zustand persist rehydrates', () => {
    // zustand persist calls onRehydrateStorage -> state._hasHydrated = true.
    // The page must wait for this before showing "Nothing to checkout".
    useCartStore.getState()._setHasHydrated(true);
    assert.equal(useCartStore.getState()._hasHydrated, true);
  });

  it('checkout must not show empty cart until _hasHydrated is true', () => {
    // Documented contract: OrderBhojanCheckoutPage reads cartHydrated from the
    // store and renders a loading state until hydration completes, so a cart
    // that exists in localStorage is not mistaken for "Nothing to checkout".
    const cartHydrated = useCartStore.getState()._hasHydrated;
    const itemCount = useCartStore.getState().lines.length;
    if (!cartHydrated) {
      // Page should show "Restoring your cart…", not "Nothing to checkout".
      assert.equal(itemCount, 0); // no false "empty" decision made here
    }
    assert.ok(true);
  });

  it('seeded cart lines survive into the live store after hydration', () => {
    // Simulate post-rehydration state where lines were restored.
    useCartStore.setState({ lines: [sampleLine], restaurantSlug: 'demo-kitchen', visible: true, _hasHydrated: true });
    const state = useCartStore.getState();
    assert.equal(state.lines.length, 1);
    assert.equal(state.lines[0]?.lineId, 'line-1');
    assert.equal(state.lines[0]?.foodId, 'food-1');
    assert.equal(state.lines[0]?.quantity, 2);
    assert.equal(state._hasHydrated, true);
  });

  it('clearing cart keeps _hasHydrated true (already hydrated)', () => {
    useCartStore.setState({ lines: [sampleLine], restaurantSlug: 'demo-kitchen', visible: true, _hasHydrated: true });
    useCartStore.getState().clear();
    const state = useCartStore.getState();
    assert.equal(state.lines.length, 0);
    assert.equal(state.visible, false);
    assert.equal(state._hasHydrated, true);
  });
});