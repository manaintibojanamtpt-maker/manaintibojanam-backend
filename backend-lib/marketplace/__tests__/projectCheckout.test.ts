import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildMarketplaceQuote, enabledPaymentMethods } from '../projectCheckout.js';

describe('projectCheckout', () => {
  it('returns COD when tenant has no payment config', () => {
    assert.deepEqual(enabledPaymentMethods({}), ['cod']);
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
});

describe('marketplace checkout frontend contract', () => {
  it('OrderBhojan checkout supports COD and Razorpay flows', () => {
    const checkout = fs.readFileSync(
      path.join(process.cwd(), 'orderbhojan/src/features/checkout/hooks/useCheckoutFlow.ts'),
      'utf8',
    );
    assert.match(checkout, /placeRazorpayOrder|placeCodOrder/);
    assert.match(checkout, /draftId/);
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
