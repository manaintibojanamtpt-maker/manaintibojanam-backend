import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPublicCouponDiscountLabel,
  projectPublicRestaurantOffers,
  resolvePrimaryCustomerOfferLabel,
} from '../projectPublicCoupons.js';

describe('projectPublicCoupons', () => {
  it('formats coupon discount labels', () => {
    assert.equal(
      formatPublicCouponDiscountLabel({ discountType: 'percentage', discountValue: 20 }),
      '20% off',
    );
    assert.equal(
      formatPublicCouponDiscountLabel({ discountType: 'fixed', discountValue: 50 }),
      '₹50 off',
    );
  });

  it('merges festival offers with linked and standalone coupons', () => {
    const offers = projectPublicRestaurantOffers(
      [
        {
          offerId: 'fest_1',
          enabled: true,
          title: 'Diwali Feast',
          displayText: '20% off orders above ₹499',
          couponCode: 'MIB20',
        },
      ],
      [
        { id: 'c1', code: 'MIB20', discountLabel: '20% off', minOrder: 499 },
        { id: 'c2', code: 'SAVE50', discountLabel: '₹50 off', minOrder: 0 },
      ],
    );

    assert.equal(offers.length, 2);
    assert.equal(offers[0]?.couponCode, 'MIB20');
    assert.equal(offers[1]?.couponCode, 'SAVE50');
  });

  it('uses coupon label when no marketplace offer is active', () => {
    const label = resolvePrimaryCustomerOfferLabel({
      promoCoupons: [{ id: 'c1', code: 'MIB20', discountLabel: '20% off', minOrder: 0 }],
    });
    assert.equal(label, '20% off');
  });
});
