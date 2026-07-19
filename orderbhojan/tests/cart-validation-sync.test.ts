import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyCartValidationResult } from '../src/features/cart/domain/applyCartValidationResult';
import type { CartLine } from '../src/features/cart/store/cartStore';
import { useCartStore } from '../src/features/cart/store/cartStore';

const baseLine: CartLine = {
  lineId: 'stale-id',
  foodId: 'stale-id',
  name: 'Old Biryani',
  price: 188,
  quantity: 1,
  restaurantSlug: 'demo',
  restaurantId: 'tenant_1',
};

describe('applyCartValidationResult', () => {
  it('removes stale menu items and returns a friendly message', () => {
    useCartStore.setState({ lines: [baseLine], restaurantSlug: 'demo', visible: true });

    const messages = applyCartValidationResult([baseLine], {
      issues: [
        {
          itemId: 'stale-id',
          code: 'NOT_FOUND',
          message: 'Item no longer on the menu',
        },
      ],
      resolvedLines: [],
    });

    assert.deepEqual(messages, ['Old Biryani is no longer on the menu and was removed from your cart.']);
    assert.equal(useCartStore.getState().lines.length, 0);
  });

  it('updates stale ids when the backend resolves by name', () => {
    useCartStore.setState({ lines: [baseLine], restaurantSlug: 'demo', visible: true });

    const messages = applyCartValidationResult([baseLine], {
      issues: [
        {
          itemId: 'stale-id',
          code: 'ID_UPDATED',
          message: 'Item was refreshed to match the latest menu',
          resolvedItemId: 'live-id',
        },
      ],
      resolvedLines: [{ itemId: 'live-id', quantity: 1, unitPrice: 199, name: 'Old Biryani' }],
    });

    assert.deepEqual(messages, ['Old Biryani was refreshed to match the latest menu.']);
    assert.equal(useCartStore.getState().lines[0]?.foodId, 'live-id');
    assert.equal(useCartStore.getState().lines[0]?.price, 199);
  });
});
