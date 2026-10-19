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

  it('resolves variant offer pricing and line items to ₹547 subtotal (2x v-full + 1x raita)', async () => {
    const biryaniId = 'item-biryani';
    const raitaId = 'item-raita';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () =>
                id === 'demo-biryani'
                  ? {
                      exists: true,
                      id: 'demo-biryani',
                      data: () => ({
                        slug: 'demo-biryani',
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
                    id: biryaniId,
                    data: () => ({
                      name: 'Chicken Dum Biryani',
                      price: 299,
                      variants: [
                        { variantId: 'v-half', displayName: 'Half', price: 199, offerPrice: 169 },
                        { variantId: 'v-full', displayName: 'Full', price: 299, offerPrice: 249 },
                      ],
                      isAvailable: true,
                    }),
                  },
                  {
                    id: raitaId,
                    data: () => ({
                      name: 'Special Raita',
                      price: 49,
                      isAvailable: true,
                    }),
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
                limit: () => ({
                  get: async () => ({ empty: true, docs: [] }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    const { quote } = await buildMarketplaceQuote(fakeDb, {
      restaurantId: 'demo-biryani',
      orderType: 'pickup',
      lines: [
        { itemId: biryaniId, variantId: 'v-full', quantity: 2 },
        { itemId: raitaId, quantity: 1 },
      ],
    });

    // 2 x 249 + 1 x 49 = 547
    assert.equal(quote.subtotal, 547);
    assert.equal(quote.grandTotal, 547);
    assert.equal(quote.packagingFee, 0);
    assert.equal(quote.deliveryFee, 0);
    assert.equal(quote.gstAmount, 0);
    assert.ok(Array.isArray(quote.items));
    assert.equal(quote.items.length, 2);
    assert.deepEqual(quote.items[0], {
      itemId: biryaniId,
      quantity: 2,
      unitPrice: 249,
      variantId: 'v-full',
      name: 'Chicken Dum Biryani (Full)',
    });
    assert.deepEqual(quote.items[1], {
      itemId: raitaId,
      quantity: 1,
      unitPrice: 49,
      name: 'Special Raita',
    });
  });

  it('strictly ignores client-supplied unitPrice and name overrides', async () => {
    const biryaniId = 'item-biryani';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () => ({
                exists: true,
                id: 'demo-biryani',
                data: () => ({ slug: 'demo-biryani', deliveryConfig: { feesConfigured: false }, pricingConfig: { packingFee: 0, gstPercent: 0 } }),
              }),
            }),
            where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: biryaniId,
                    data: () => ({
                      name: 'Chicken Dum Biryani',
                      price: 299,
                      variants: [{ variantId: 'v-full', displayName: 'Full', price: 299, offerPrice: 249 }],
                      isAvailable: true,
                    }),
                  },
                ],
              }),
            }),
          };
        }
        if (name === 'coupons') {
          return { where: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }) };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    const { quote } = await buildMarketplaceQuote(fakeDb, {
      restaurantId: 'demo-biryani',
      orderType: 'pickup',
      lines: [
        {
          itemId: biryaniId,
          variantId: 'v-full',
          quantity: 1,
          unitPrice: 1, // Malicious client attempt: override to ₹1
          name: 'Hacked Free Biryani', // Malicious client attempt: override name
        },
      ],
    });

    // Server-authoritative validation must ignore client's unitPrice and name
    assert.equal(quote.subtotal, 249);
    assert.equal(quote.grandTotal, 249);
    assert.equal(quote.items?.[0].unitPrice, 249);
    assert.equal(quote.items?.[0].name, 'Chicken Dum Biryani (Full)');
  });

  it('rejects unknown or another item variantId', async () => {
    const biryaniId = 'item-biryani';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, id: 'demo-biryani', data: () => ({ slug: 'demo-biryani', deliveryConfig: {} }) }),
            }),
            where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: biryaniId,
                    data: () => ({
                      name: 'Chicken Dum Biryani',
                      price: 299,
                      variants: [{ variantId: 'v-full', displayName: 'Full', price: 299, offerPrice: 249 }],
                      isAvailable: true,
                    }),
                  },
                ],
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
          restaurantId: 'demo-biryani',
          orderType: 'pickup',
          lines: [{ itemId: biryaniId, variantId: 'v-pizza-large', quantity: 1 }],
        }),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Variant 'v-pizza-large' is not valid for item 'Chicken Dum Biryani'/);
        return true;
      },
    );
  });

  it('rejects missing variant selection when item requires a choice', async () => {
    const biryaniId = 'item-biryani';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, id: 'demo-biryani', data: () => ({ slug: 'demo-biryani', deliveryConfig: {} }) }),
            }),
            where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: biryaniId,
                    data: () => ({
                      name: 'Chicken Dum Biryani',
                      price: 299,
                      variants: [
                        { variantId: 'v-half', displayName: 'Half', price: 199 },
                        { variantId: 'v-full', displayName: 'Full', price: 299 },
                      ],
                      isAvailable: true,
                    }),
                  },
                ],
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
          restaurantId: 'demo-biryani',
          orderType: 'pickup',
          lines: [{ itemId: biryaniId, quantity: 1 }],
        }),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Variant selection is required for 'Chicken Dum Biryani'/);
        return true;
      },
    );
  });

  it('rejects unavailable variants', async () => {
    const biryaniId = 'item-biryani';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, id: 'demo-biryani', data: () => ({ slug: 'demo-biryani', deliveryConfig: {} }) }),
            }),
            where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: biryaniId,
                    data: () => ({
                      name: 'Chicken Dum Biryani',
                      price: 299,
                      variants: [
                        { variantId: 'v-full', displayName: 'Full', price: 299, isAvailable: false },
                      ],
                      isAvailable: true,
                    }),
                  },
                ],
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
          restaurantId: 'demo-biryani',
          orderType: 'pickup',
          lines: [{ itemId: biryaniId, variantId: 'v-full', quantity: 1 }],
        }),
      (err: any) => {
        assert.equal(err.statusCode, 400);
        assert.match(err.message, /Variant 'Full' of 'Chicken Dum Biryani' is currently unavailable/);
        return true;
      },
    );
  });

  it('keeps two variants of the same dish as separate distinct lines', async () => {
    const biryaniId = 'item-biryani';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: () => ({
              get: async () => ({ exists: true, id: 'demo-biryani', data: () => ({ slug: 'demo-biryani', deliveryConfig: {} }) }),
            }),
            where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: [
                  {
                    id: biryaniId,
                    data: () => ({
                      name: 'Chicken Dum Biryani',
                      price: 299,
                      variants: [
                        { variantId: 'v-half', displayName: 'Half', price: 199, offerPrice: 169 },
                        { variantId: 'v-full', displayName: 'Full', price: 299, offerPrice: 249 },
                      ],
                      isAvailable: true,
                    }),
                  },
                ],
              }),
            }),
          };
        }
        if (name === 'coupons') {
          return { where: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }) }) };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    const { quote } = await buildMarketplaceQuote(fakeDb, {
      restaurantId: 'demo-biryani',
      orderType: 'pickup',
      lines: [
        { itemId: biryaniId, variantId: 'v-half', quantity: 1 },
        { itemId: biryaniId, variantId: 'v-full', quantity: 2 },
      ],
    });

    // 1 x 169 + 2 x 249 = 169 + 498 = 667
    assert.equal(quote.subtotal, 667);
    assert.equal(quote.items?.length, 2);
    assert.equal(quote.items?.[0].variantId, 'v-half');
    assert.equal(quote.items?.[0].quantity, 1);
    assert.equal(quote.items?.[0].unitPrice, 169);
    assert.equal(quote.items?.[1].variantId, 'v-full');
    assert.equal(quote.items?.[1].quantity, 2);
    assert.equal(quote.items?.[1].unitPrice, 249);
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
                limit: () => ({
                  get: async () => ({ empty: true, docs: [] }),
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

  it('rejects coupon codes scoped to a different tenant during quote', async () => {
    const menuItemId = 'item-thali';
    const fakeDb = {
      collection: (name: string) => {
        if (name === 'tenants') {
          return {
            doc: (id: string) => ({
              get: async () =>
                id === 'inti-bhojanam-pune'
                  ? {
                      exists: true,
                      id: 'inti-bhojanam-pune',
                      data: () => ({
                        slug: 'inti-bhojanam-pune',
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
          };
        }
        throw new Error(`unexpected collection ${name}`);
      },
    } as never;

    await assert.rejects(
      () =>
        buildMarketplaceQuote(fakeDb, {
          restaurantId: 'inti-bhojanam-pune',
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

describe('authoritative checkout variant contracts', () => {
  function makeCheckoutDb(menuDocs: any[]) {
    return {
      collection(name: string) {
        if (name === 'tenants') {
          return {
            doc: (docId: string) => ({
              get: async () => ({
                id: docId,
                exists: true,
                data: () => ({ storeStatus: 'open', pricingConfig: { baseDeliveryFee: 30 } }),
              }),
            }),
            where: () => ({
              limit: () => ({
                get: async () => ({
                  empty: false,
                  docs: [{ id: 'tenant_t1', data: () => ({ storeStatus: 'open', pricingConfig: { baseDeliveryFee: 30 } }) }],
                }),
              }),
            }),
          };
        }
        if (name === 'menu') {
          return {
            where: () => ({
              get: async () => ({
                docs: menuDocs.map((m) => ({
                  id: m.id,
                  data: () => m.data,
                })),
              }),
            }),
          };
        }
        throw new Error(`Unexpected collection: ${name}`);
      },
    } as any;
  }

  it('Case 1: Zero available variants rejects purchase with 400', async () => {
    const db = makeCheckoutDb([
      {
        id: 'item_zero_var',
        data: {
          name: 'Zero Var Biryani',
          price: 250,
          isAvailable: true,
          variants: [
            { variantId: 'v1', name: 'Small', price: 150, isAvailable: false },
            { variantId: 'v2', name: 'Large', price: 250, isAvailable: false },
          ],
        },
      },
    ]);

    await assert.rejects(
      () =>
        buildMarketplaceQuote(db, {
          restaurantId: 'tenant_t1',
          orderType: 'pickup',
          lines: [{ itemId: 'item_zero_var', quantity: 1 }],
        }),
      (err: any) => err.statusCode === 400 && err.message.includes("Item 'Zero Var Biryani' is currently unavailable"),
    );
  });

  it('Case 2: Exactly one available variant auto-resolves and preserves its ID and effective price', async () => {
    const db = makeCheckoutDb([
      {
        id: 'item_single_var',
        data: {
          name: 'Single Var Curry',
          price: 200,
          isAvailable: true,
          variants: [
            { variantId: 'v_only', name: 'Standard', price: 200, offerPrice: 175, isAvailable: true },
            { variantId: 'v_out', name: 'Extra Large', price: 300, isAvailable: false },
          ],
        },
      },
    ]);

    // Omit variantId -> auto-resolves to single available variant v_only @ 175
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'tenant_t1',
      orderType: 'pickup',
      lines: [{ itemId: 'item_single_var', quantity: 2 }],
    });

    assert.equal(quote.lines[0].variantId, 'v_only');
    assert.equal(quote.lines[0].unitPrice, 175);
    assert.equal(quote.lines[0].name, 'Single Var Curry (Standard)');
    assert.equal(quote.subtotal, 350);
  });

  it('Case 3: Multiple available variants requires selection and rejects missing variantId', async () => {
    const db = makeCheckoutDb([
      {
        id: 'item_multi_var',
        data: {
          name: 'Multi Var Pulao',
          price: 220,
          isAvailable: true,
          variants: [
            { variantId: 'v_half', name: 'Half', price: 120, isAvailable: true },
            { variantId: 'v_full', name: 'Full', price: 220, isAvailable: true },
          ],
        },
      },
    ]);

    await assert.rejects(
      () =>
        buildMarketplaceQuote(db, {
          restaurantId: 'tenant_t1',
          orderType: 'pickup',
          lines: [{ itemId: 'item_multi_var', quantity: 1 }],
        }),
      (err: any) => err.statusCode === 400 && err.message.includes('Variant selection is required'),
    );
  });

  it('Case 4: A variant becoming unavailable after proposal is rejected at checkout with 400', async () => {
    const db = makeCheckoutDb([
      {
        id: 'item_cb',
        data: {
          name: 'Hyderabadi Chicken Biryani',
          price: 299,
          isAvailable: true,
          variants: [
            { variantId: 'v_full', name: 'Full', price: 249, isAvailable: false }, // Now out of stock!
            { variantId: 'v_half', name: 'Half', price: 149, isAvailable: true },
          ],
        },
      },
    ]);

    await assert.rejects(
      () =>
        buildMarketplaceQuote(db, {
          restaurantId: 'tenant_t1',
          orderType: 'pickup',
          lines: [{ itemId: 'item_cb', quantity: 2, variantId: 'v_full' }],
        }),
      (err: any) => err.statusCode === 400 && err.message.includes("Variant 'Full' of 'Hyderabadi Chicken Biryani' is currently unavailable"),
    );
  });
});
