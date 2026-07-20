import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildMarketplaceQuote, enabledPaymentMethods } from '../projectCheckout.js';

describe('projectCheckout', () => {
  it('returns COD when tenant has no payment config', () => {
    assert.deepEqual(enabledPaymentMethods({}), ['cod']);
  });

  it('returns UPI when direct UPI is enabled with a valid upiId', () => {
    assert.deepEqual(
      enabledPaymentMethods({
        paymentConfig: {
          providers: {
            cod: { enabled: true },
            razorpay: { enabled: false },
            upi: { enabled: true, upiId: 'kitchen@paytm' },
          },
        },
      }),
      ['cod', 'upi'],
    );
  });

  it('omits UPI when razorpay is disabled but upiId is missing', () => {
    assert.deepEqual(
      enabledPaymentMethods({
        paymentConfig: {
          providers: {
            cod: { enabled: true },
            razorpay: { enabled: false },
            upi: { enabled: true, upiId: '' },
          },
        },
      }),
      ['cod'],
    );
  });

  it('returns only UPI when COD is disabled and razorpay is off', () => {
    assert.deepEqual(
      enabledPaymentMethods({
        paymentConfig: {
          providers: {
            cod: { enabled: false },
            razorpay: { enabled: false },
            upi: { enabled: true, upiId: 'kitchen@paytm' },
          },
        },
      }),
      ['upi'],
    );
  });

  it('registers marketplace quote and checkout routes', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceRoutes.ts'),
      'utf8',
    );
    for (const route of [
      'app.post(`${prefix}/quote`',
      'app.post(`${prefix}/checkout/prepare`',
    ]) {
      assert.match(source, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.match(source, /\$\{prefix\}\/checkout\/place/);
    assert.match(source, /optionalFirebaseAuth/);
  });

  it('buildMarketplaceQuote rejects empty lines', async () => {
    const fakeDb = {
      collection: () => ({
        doc: () => ({ get: async () => ({ exists: false }) }),
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      }),
    } as never;

    await assert.rejects(
      () => buildMarketplaceQuote(fakeDb, { restaurantId: 'demo', orderType: 'pickup', lines: [] }),
      /At least one line item/,
    );
  });

  it('applies percentage coupon discount to quote line items', async () => {
    const menuItemId = 'item-thali';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () =>
                id === 'mana-inti'
                  ? {
                      exists: true,
                      id: 'mana-inti',
                      data: () => ({
                        slug: 'mana-inti',
                        deliveryConfig: { feesConfigured: false },
                        pricingConfig: { packingFee: 0, gstPercent: 0 },
                      }),
                    }
                  : { exists: false },
            }),
            where: () => ({
              limit: () => ({
                get: async () => ({ empty: true, docs: [] }),
              }),
            }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: menuItemId,
                    data: () => ({ price: 555, name: 'Thali', isAvailable: true }),
                  },
                ],
              }),
            }),
          };
        }
        if (name === 'coupons') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  limit: () => ({
                    get: async () => ({
                      empty: false,
                      docs: [
                        {
                          data: () => ({
                            code: 'MIB20',
                            tenantId: 'mana-inti',
                            discountType: 'percentage',
                            discountValue: 20,
                            minOrder: 499,
                            isActive: true,
                          }),
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    const { quote } = await buildMarketplaceQuote(fakeDb, {
      restaurantId: 'mana-inti',
      orderType: 'pickup',
      couponCode: 'MIB20',
      lines: [{ itemId: menuItemId, quantity: 1 }],
    });

    assert.equal(quote.subtotal, 555);
    assert.equal(quote.discountAmount, 111);
    assert.equal(quote.grandTotal, 444);
    assert.deepEqual(quote.lineItems, [
      { label: 'Item Total', amount: 555 },
      { label: 'Discount (MIB20)', amount: -111 },
    ]);
  });

  it('applies 20 percent MIB20 discount to a 765 subtotal', async () => {
    const menuItemId = 'item-feast';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () =>
                id === 'mana-inti'
                  ? {
                      exists: true,
                      id: 'mana-inti',
                      data: () => ({
                        slug: 'mana-inti',
                        deliveryConfig: { feesConfigured: false },
                        pricingConfig: { packingFee: 0, gstPercent: 0 },
                      }),
                    }
                  : { exists: false },
            }),
            where: () => ({
              limit: () => ({
                get: async () => ({ empty: true, docs: [] }),
              }),
            }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: menuItemId,
                    data: () => ({ price: 765, name: 'Family Feast', isAvailable: true }),
                  },
                ],
              }),
            }),
          };
        }
        if (name === 'coupons') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  limit: () => ({
                    get: async () => ({
                      empty: false,
                      docs: [
                        {
                          data: () => ({
                            code: 'MIB20',
                            tenantId: 'mana-inti',
                            discountType: 'percentage',
                            discountValue: 20,
                            minOrder: 599,
                            isActive: true,
                          }),
                        },
                      ],
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    const { quote } = await buildMarketplaceQuote(fakeDb, {
      restaurantId: 'mana-inti',
      orderType: 'pickup',
      couponCode: 'MIB20',
      lines: [{ itemId: menuItemId, quantity: 1 }],
    });

    assert.equal(quote.subtotal, 765);
    assert.equal(quote.discountAmount, 153);
    assert.equal(quote.grandTotal, 612);
  });

  it('rejects invalid coupon codes during quote', async () => {
    const menuItemId = 'item-thali';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () =>
                id === 'mana-inti'
                  ? {
                      exists: true,
                      id: 'mana-inti',
                      data: () => ({
                        slug: 'mana-inti',
                        deliveryConfig: { feesConfigured: false },
                        pricingConfig: { packingFee: 0, gstPercent: 0 },
                      }),
                    }
                  : { exists: false },
            }),
            where: () => ({
              limit: () => ({
                get: async () => ({ empty: true, docs: [] }),
              }),
            }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: menuItemId,
                    data: () => ({ price: 555, name: 'Thali', isAvailable: true }),
                  },
                ],
              }),
            }),
          };
        }
        if (name === 'coupons') {
          return {
            where: () => ({
              where: () => ({
                where: () => ({
                  limit: () => ({
                    get: async () => ({ empty: true, docs: [] }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    await assert.rejects(
      () =>
        buildMarketplaceQuote(fakeDb, {
          restaurantId: 'mana-inti',
          orderType: 'pickup',
          couponCode: 'MIB20',
          lines: [{ itemId: menuItemId, quantity: 1 }],
        }),
      /not valid for this kitchen/,
    );
  });
});

describe('marketplace checkout frontend contract', () => {
  it('OrderBhojan checkout supports COD, Razorpay, and direct UPI flows', () => {
    const checkout = fs.readFileSync(
      path.join(process.cwd(), 'orderbhojan/src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );
    assert.match(checkout, /placeRazorpayOrder|placeCodOrder|placeUpiOrder/);
    assert.match(checkout, /draftId/);
    assert.match(checkout, /upiUrl/);
    const checkoutPage = fs.readFileSync(
      path.join(process.cwd(), 'orderbhojan/src/presentation/checkout/OrderBhojanCheckoutPage.tsx'),
      'utf8',
    );
    assert.match(checkoutPage, /supportsUpi/);
    assert.match(checkoutPage, /Pay via UPI/);
    assert.match(checkoutPage, /handlePlaceUpi/);
    const razorpay = fs.readFileSync(
      path.join(process.cwd(), 'orderbhojan/src/features/checkout/infrastructure/razorpayCheckout.ts'),
      'utf8',
    );
    assert.match(razorpay, /create-razorpay-order/);
  });

  it('registers marketplace order list and tracking routes when auth is wired', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceRoutes.ts'),
      'utf8',
    );
    assert.match(source, /orders\/:orderId\/tracking/);
    assert.match(source, /listMarketplaceOrdersForUser/);
  });

  it('checkout place returns draftId for razorpay payment method', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/projectCheckout.ts'),
      'utf8',
    );
    assert.match(source, /kind: 'razorpay'/);
    assert.match(source, /order_drafts/);
    assert.match(source, /deliveryType: schedule\.deliveryType/);
    assert.match(source, /scheduledFor: schedule\.scheduledFor/);
  });

  it('checkout prepare exposes scheduling context', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceRoutes.ts'),
      'utf8',
    );
    assert.match(source, /buildMarketplaceCheckoutPrepare/);
    assert.match(source, /scheduling/);
  });

  it('checkout flow rejects undiscounted prepare quotes when a coupon is applied', () => {
    const checkoutFlow = fs.readFileSync(
      path.join(process.cwd(), 'orderbhojan/src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );
    assert.match(checkoutFlow, /isCheckoutPrepareSessionCompatible\(prepareQuery\.data, appliedCouponCode\)/);
    assert.match(checkoutFlow, /getState\(\)\.appliedCouponCode/);
  });
});

describe('marketplace referral reward API', () => {
  it('registers authenticated referral apply route', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/marketplaceReferralRoutes.ts'),
      'utf8',
    );
    assert.match(source, /app\.post\('\/api\/marketplace\/referrals\/apply'/);
    assert.match(source, /pendingDiscount/);
  });
});
