import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckoutCartSignature,
  persistCheckoutPrepareSession,
  readCheckoutPrepareSession,
} from '../src/features/checkout/infrastructure/checkoutQuoteSession';

describe('checkoutQuoteSession', () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'sessionStorage');
  });

  it('reads cached prepare response by cart signature', () => {
    const lines = [
      {
        lineId: 'a',
        foodId: 'item-1',
        name: 'Thali',
        price: 120,
        quantity: 2,
        restaurantSlug: 'demo',
        restaurantId: 'rest_demo',
      },
    ] as const;

    const cartSignature = buildCheckoutCartSignature({
      restaurantId: 'rest_demo',
      contextToken: 'ctx_1',
      lines,
    });

    persistCheckoutPrepareSession('sig-a', cartSignature, {
      paymentMethods: ['cod'],
      quote: {
        subtotal: 240,
        gstAmount: 12,
        gstPercent: 5,
        packagingFee: 0,
        deliveryFee: 40,
        deliveryPending: false,
        discountAmount: 0,
        grandTotal: 292,
        taxLabel: 'GST (5%)',
        lineItems: [{ label: 'Item Total', amount: 240 }],
      },
    });

    const cached = readCheckoutPrepareSession(cartSignature);
    assert.ok(cached);
    assert.equal(cached?.quote.grandTotal, 292);
    assert.deepEqual(cached?.paymentMethods, ['cod']);
  });
});
