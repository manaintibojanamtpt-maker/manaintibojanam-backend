import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMarketplaceQuote } from '../projectCheckout.js';
import {
  amountToPaise,
  assertDraftRazorpayAmountIntegrity,
  fetchAndAssertRazorpayDraftPaymentAmounts,
  RazorpayAmountMismatchError,
  resolveCreateRazorpayOrderAmount,
  resolveDraftTotalAmount,
} from '../razorpayAmountIntegrity.js';

function buildDraftFromQuote(grandTotal: number) {
  return {
    orderPayload: {
      totalAmount: grandTotal,
      subtotal: grandTotal,
      gstAmount: 0,
    },
  };
}

describe('razorpayAmountIntegrity', () => {
  it('uses gstPercent 0 tenant quote grandTotal as authoritative Razorpay amount (no +5% GST)', async () => {
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
                    data: () => ({ price: 400, name: 'Thali', isAvailable: true }),
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
      restaurantId: 'mana-inti',
      orderType: 'pickup',
      lines: [{ itemId: menuItemId, quantity: 1 }],
    });

    assert.equal(quote.gstPercent, 0);
    assert.equal(quote.grandTotal, 400);

    const draft = buildDraftFromQuote(quote.grandTotal);
    const draftTotal = resolveCreateRazorpayOrderAmount(draft);
    assert.equal(draftTotal, 400);
    assert.equal(amountToPaise(draftTotal), 40_000);

    const legacyWrongPaise = amountToPaise(400 + 400 * 0.05);
    assert.equal(legacyWrongPaise, 42_000);
    assert.throws(
      () => assertDraftRazorpayAmountIntegrity(draft, legacyWrongPaise),
      RazorpayAmountMismatchError,
    );
  });

  it('supports non-zero GST tenant totals from draft payload', () => {
    const draft = {
      orderPayload: {
        totalAmount: 420,
        subtotal: 400,
        gstPercent: 5,
        gstAmount: 20,
      },
    };

    assert.equal(resolveDraftTotalAmount(draft), 420);
    assert.equal(amountToPaise(resolveCreateRazorpayOrderAmount(draft)), 42_000);
    assert.doesNotThrow(() => assertDraftRazorpayAmountIntegrity(draft, 42_000, 42_000));
  });

  it('rounds fractional rupee totals to paise (₹388.50 → 38850 paise)', () => {
    const draft = buildDraftFromQuote(388.5);
    assert.equal(amountToPaise(resolveCreateRazorpayOrderAmount(draft)), 38_850);
    assert.doesNotThrow(() => assertDraftRazorpayAmountIntegrity(draft, 38_850, 38_850));
  });

  it('rejects verify promotion when Razorpay paid amount does not match draft total', async () => {
    const draft = buildDraftFromQuote(400);
    const razorpayClient = {
      orders: {
        fetch: async () => ({ amount: 42_000 }),
      },
      payments: {
        fetch: async () => ({ amount: 42_000 }),
      },
    };

    await assert.rejects(
      () =>
        fetchAndAssertRazorpayDraftPaymentAmounts(
          razorpayClient,
          draft,
          'order_test',
          'pay_test',
        ),
      (error: unknown) => {
        assert.ok(error instanceof RazorpayAmountMismatchError);
        assert.match((error as Error).message, /expected 40000 paise/);
        return true;
      },
    );
  });

  it('rejects conflicting draft root and payload totals', () => {
    assert.throws(
      () =>
        resolveDraftTotalAmount({
          totalAmount: 420,
          orderPayload: { totalAmount: 400 },
        }),
      RazorpayAmountMismatchError,
    );
  });
});
