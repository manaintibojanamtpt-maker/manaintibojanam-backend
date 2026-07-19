import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listCopyableCouponCodes } from '../src/features/restaurant/domain/promoOffers';
import { buildCheckoutPrepareSignature } from '../src/features/checkout/domain/checkoutPayload';

describe('checkout promo sync', () => {
  it('collects linked festival offers and standalone promo codes', () => {
    const codes = listCopyableCouponCodes({
      offers: [
        {
          id: 'fest_1',
          title: 'Diwali Feast',
          couponCode: 'MIB20',
        },
      ],
      promoCodes: [
        { id: 'c1', code: 'MIB20', discountLabel: '20% off', minOrder: 499 },
        { id: 'c2', code: 'SAVE50', discountLabel: '₹50 off', minOrder: 0 },
      ],
    });

    assert.equal(codes.length, 2);
    assert.deepEqual(codes.map((entry) => entry.code), ['MIB20', 'SAVE50']);
  });

  it('includes coupon code in checkout prepare signature', () => {
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

    const signature = buildCheckoutPrepareSignature({
      restaurantId: 'rest_demo',
      contextToken: 'ctx_1',
      lines,
      lat: 18.5362,
      lng: 73.8958,
      couponCode: 'MIB20',
    });

    assert.match(signature, /MIB20/);
  });
});
