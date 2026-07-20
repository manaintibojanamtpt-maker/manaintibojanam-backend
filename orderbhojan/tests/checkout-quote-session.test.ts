import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCheckoutCartSignature,
  isCheckoutPrepareSessionCompatible,
  persistCheckoutPrepareSession,
  readCheckoutPrepareSession,
} from '../src/features/checkout/infrastructure/checkoutQuoteSession';
import { buildCheckoutPrepareSignature } from '../src/features/checkout/domain/checkoutPayload';

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

  it('matches cached prepare response by exact prepare signature', () => {
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
      couponCode: 'MIB20',
    });
    const prepareSignature = buildCheckoutPrepareSignature({
      restaurantId: 'rest_demo',
      contextToken: 'ctx_1',
      lines,
      lat: 18.5362,
      lng: 73.8958,
      couponCode: 'MIB20',
    });

    persistCheckoutPrepareSession(prepareSignature, cartSignature, {
      paymentMethods: ['cod'],
      quote: {
        subtotal: 765,
        gstAmount: 0,
        gstPercent: 0,
        packagingFee: 0,
        deliveryFee: 40,
        deliveryPending: false,
        discountAmount: 153,
        grandTotal: 652,
        taxLabel: 'Taxes and Charges',
        lineItems: [
          { label: 'Item Total', amount: 765 },
          { label: 'Discount (MIB20)', amount: -153 },
          { label: 'Delivery', amount: 40 },
        ],
      },
    });

    const stalePrepareSignature = buildCheckoutPrepareSignature({
      restaurantId: 'rest_demo',
      contextToken: 'ctx_1',
      lines,
      lat: 18.5200,
      lng: 73.8800,
      couponCode: 'MIB20',
    });
    persistCheckoutPrepareSession(stalePrepareSignature, cartSignature, {
      paymentMethods: ['cod'],
      quote: {
        subtotal: 765,
        gstAmount: 0,
        gstPercent: 0,
        packagingFee: 0,
        deliveryFee: 40,
        deliveryPending: false,
        discountAmount: 0,
        grandTotal: 805,
        taxLabel: 'Taxes and Charges',
        lineItems: [
          { label: 'Item Total', amount: 765 },
          { label: 'Delivery', amount: 40 },
        ],
      },
    });

    assert.equal(readCheckoutPrepareSession(cartSignature, stalePrepareSignature)?.quote.grandTotal, 805);
    const exact = readCheckoutPrepareSession(cartSignature, prepareSignature);
    assert.ok(exact);
    assert.equal(exact?.quote.discountAmount, 153);
    assert.equal(exact?.quote.grandTotal, 652);
  });

  it('rejects cached coupon quotes without a matching discount line', () => {
    const response = {
      paymentMethods: ['cod'],
      quote: {
        subtotal: 765,
        gstAmount: 0,
        gstPercent: 0,
        packagingFee: 0,
        deliveryFee: 0,
        deliveryPending: false,
        discountAmount: 0,
        grandTotal: 765,
        taxLabel: 'Taxes and Charges',
        lineItems: [{ label: 'Item Total', amount: 765 }],
      },
    };

    assert.equal(isCheckoutPrepareSessionCompatible(response, 'MIB20'), false);
    assert.equal(isCheckoutPrepareSessionCompatible(response, null), true);
    assert.equal(
      isCheckoutPrepareSessionCompatible(
        {
          ...response,
          quote: {
            ...response.quote,
            discountAmount: 153,
            grandTotal: 612,
            lineItems: [
              { label: 'Item Total', amount: 765 },
              { label: 'Discount (MIB20)', amount: -153 },
            ],
          },
        },
        'MIB20',
      ),
      true,
    );
  });
});
