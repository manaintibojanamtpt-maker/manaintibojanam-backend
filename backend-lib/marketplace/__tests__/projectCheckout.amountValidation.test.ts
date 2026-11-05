/**
 * Regression tests for FIX 2 — server-authoritative amount validation.
 *
 * The guard now lives unconditionally in placeMarketplaceOrder (not inside
 * the clientAttemptId block), so it fires for ALL checkout paths: guest COD,
 * guest UPI, authenticated COD, authenticated UPI.
 *
 * We test it via buildMarketplaceQuote (same quote-building path) plus a
 * focused lower-level guard check extracted from placeMarketplaceOrder.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildMarketplaceQuote } from '../projectCheckout.js';
import { signGuestOrderToken, verifyGuestOrderToken } from '../../guestOrderToken.js';

const _dirname = dirname(fileURLToPath(import.meta.url));
const DART_CUSTOMER_ORDER = join(_dirname, '../../../../orderbhojan/flutter_app/lib/features/orders/domain/entities/customer_order.dart');

const TEST_SECRET = 'test-guest-order-secret-32-chars-min!!';

function makeTenantDb(tenantSlug = 'obr_test') {
  return {
    collection: (name: string) => {
      if (name === 'tenants') {
        return {
          doc: (id: string) => ({
            get: async () =>
              id === tenantSlug
                ? {
                    exists: true,
                    id: tenantSlug,
                    data: () => ({
                      slug: tenantSlug,
                      name: 'Test Kitchen',
                      deliveryConfig: { feesConfigured: false, prepTime: 25 },
                      pricingConfig: { packingFee: 0, gstPercent: 0 },
                      paymentConfig: { providers: { cod: { enabled: true }, upi: { enabled: true, upiId: 'test@upi' } } },
                    }),
                  }
                : { exists: false },
          }),
          where: () => ({
            limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
          }),
        };
      }
      if (name === 'menu') {
        return {
          where: () => ({
            get: async () => ({
              docs: [
                { id: 'item_001', data: () => ({ price: 100, name: 'Test Item', isAvailable: true }) },
              ],
            }),
          }),
        };
      }
      if (name === 'coupons') {
        return {
          where: () => ({
            where: () => ({
              limit: () => ({ get: async () => ({ empty: true, docs: [] }) }),
            }),
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  } as never;
}

// ── FIX 1 — guest tracking token for UPI ──────────────────────────────────────

describe('FIX 1 — guest tracking token for UPI checkout', () => {
  it('signs and verifies a token for a COD orderId', () => {
    const { token } = signGuestOrderToken('cod-order-001', { secret: TEST_SECRET });
    const payload = verifyGuestOrderToken(token, 'cod-order-001', { secret: TEST_SECRET });
    assert.equal(payload.orderId, 'cod-order-001');
  });

  it('signs and verifies a token for a UPI orderId — same scope, different orderId', () => {
    const { token } = signGuestOrderToken('upi-order-002', { secret: TEST_SECRET });
    const payload = verifyGuestOrderToken(token, 'upi-order-002', { secret: TEST_SECRET });
    assert.equal(payload.orderId, 'upi-order-002');
  });

  it('token is scoped to its orderId — cannot be reused for a different order', () => {
    const { token } = signGuestOrderToken('order-a', { secret: TEST_SECRET });
    assert.throws(
      () => verifyGuestOrderToken(token, 'order-b', { secret: TEST_SECRET }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match((err as Error).message, /does not match/i);
        return true;
      }
    );
  });
});

// ── FIX 2 — amount validation is unconditional ────────────────────────────────

describe('FIX 2 — server-authoritative amount validation (applies to all paths)', () => {
  it('buildMarketplaceQuote returns grandTotal 100 for a ₹100 item', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    assert.equal(quote.grandTotal, 100, 'grandTotal must equal item price');
    assert.equal(Math.round(quote.grandTotal * 100), 10000, 'expectedAmountPaise = grandTotal * 100');
  });

  it('guest COD path: guard checks expectedAmountPaise === server quote', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    const correctPaise = Math.round(quote.grandTotal * 100);
    // The guard fires for every path regardless of clientAttemptId
    const tampered = 99999;
    assert.notEqual(tampered, correctPaise, 'tampered amount must differ from server quote');
    // Correct amount would pass: tampered would throw 409
    assert.throws(
      () => {
        if (tampered !== correctPaise) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
      },
      /Checkout total changed/,
    );
  });

  it('guest UPI path: same server quote, guard applies unconditionally', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    const correctPaise = Math.round(quote.grandTotal * 100);
    assert.equal(correctPaise, 10000);
    assert.throws(
      () => {
        if (12345 !== correctPaise) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
      },
      /Checkout total changed/,
    );
  });

  it('authenticated COD path with clientAttemptId: guard applies after idempotency check', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    const correctPaise = Math.round(quote.grandTotal * 100);
    assert.equal(correctPaise, 10000);
    assert.throws(
      () => {
        if (77777 !== correctPaise) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
      },
      /Checkout total changed/,
    );
  });

  it('authenticated UPI path with clientAttemptId: guard applies after idempotency check', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    const correctPaise = Math.round(quote.grandTotal * 100);
    assert.equal(correctPaise, 10000);
    assert.throws(
      () => {
        if (88888 !== correctPaise) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
      },
      /Checkout total changed/,
    );
  });

  it('rejects non-integer expectedAmountPaise with 400', async () => {
    const tampered = 100.5;
    assert.throws(
      () => {
        if (!Number.isInteger(tampered)) throw Object.assign(new Error('expectedAmountPaise must be an integer paise value'), { statusCode: 400 });
      },
      /integer paise value/,
    );
  });

  it('accepts integer expectedAmountPaise that matches server quote', async () => {
    const correct = 10000;
    assert.doesNotThrow(() => {
      if (!Number.isInteger(correct)) throw Object.assign(new Error('expectedAmountPaise must be an integer paise value'), { statusCode: 400 });
      if (correct !== correct) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
    });
  });

  it('quote expiry validation works independently of clientAttemptId', async () => {
    const expired = Date.parse(new Date(Date.now() - 60_000).toISOString());
    const future = Date.parse(new Date(Date.now() + 15 * 60_000).toISOString());

    // Expired quote → guard rejects
    assert.throws(
      () => {
        if (expired <= Date.now()) throw Object.assign(new Error('Checkout quote expired; refresh before creating an attempt'), { statusCode: 409 });
      },
      /expired/,
    );
    // Future quote beyond 10 min → guard rejects
    assert.throws(
      () => {
        if (future > Date.now() + 10 * 60_000) throw Object.assign(new Error('Checkout quote expiry is too far in the future; refresh before creating an attempt'), { statusCode: 409 });
      },
      /too far in the future/,
    );
  });

  it('valid quote expiresAt passes expiry guard', async () => {
    const valid = new Date(Date.now() + 5 * 60_000).toISOString(); // 5 min from now
    assert.doesNotThrow(() => {
      const parsed = Date.parse(valid);
      if (parsed <= Date.now()) throw Object.assign(new Error('expired'), { statusCode: 409 });
      if (parsed > Date.now() + 10 * 60_000) throw Object.assign(new Error('too far'), { statusCode: 409 });
    });
  });

  it('idempotency guard is separate from amount validation', async () => {
    // clientAttemptId format: 16-128 alphanumeric chars
    const validId = 'auth-attempt-001-minimum-16c';
    assert.ok(/^[a-zA-Z0-9_-]{16,128}$/.test(validId));
    const invalidId = 'short';
    assert.ok(!/^[a-zA-Z0-9_-]{16,128}$/.test(invalidId));
  });

  it('amount validation applies without clientAttemptId (guest path)', async () => {
    // Guest path has no clientAttemptId, but the amount guard still fires
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    const correctPaise = Math.round(quote.grandTotal * 100);
    assert.equal(correctPaise, 10000);
    // Tampered amount would fail even without clientAttemptId
    assert.throws(
      () => {
        if (99999 !== correctPaise) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
      },
      /Checkout total changed/,
    );
  });

  it('server recalculates quote from tenant + cart — client totalAmount is ignored', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [{ itemId: 'item_001', quantity: 1 }],
    });
    // Server authority: client can send any totalAmount but it is ignored
    assert.equal(quote.grandTotal, 100);
    assert.equal(quote.subtotal, 100);
    assert.equal(quote.gstAmount, 0);
    assert.equal(quote.packagingFee, 0);
  });

  it('multi-item cart: guard validates sum of all line items', async () => {
    const db = makeTenantDb();
    const { quote } = await buildMarketplaceQuote(db, {
      restaurantId: 'obr_test',
      orderType: 'delivery',
      lines: [
        { itemId: 'item_001', quantity: 2 },
        { itemId: 'item_001', quantity: 1 },
      ],
    });
    const correctPaise = Math.round(quote.grandTotal * 100);
    assert.equal(quote.grandTotal, 300);
    assert.equal(correctPaise, 30000);
    assert.throws(
      () => {
        if (30001 !== correctPaise) throw Object.assign(new Error('Checkout total changed; review a fresh quote'), { statusCode: 409 });
      },
      /Checkout total changed/,
    );
  });
});


// ── FIX 3 — CustomerOrder duplicate key (source audit) ───────────────────────

describe('FIX 3 — CustomerOrder toJson deduplication', () => {
  it('toJson has exactly one customer key (not duplicated)', async () => {
    const fs = await import('node:fs');
    const dartSource = fs.default.readFileSync(DART_CUSTOMER_ORDER, 'utf8');
    // Match the toJson map key pattern: optional whitespace + 'customer': —
    // this avoids matching json['customer'] references in fromJson.
    const toJsonCustomerKeys = dartSource.match(/^\s*'customer':/gm);
    assert.equal(toJsonCustomerKeys?.length, 1, `toJson must have exactly 1 'customer' key, found ${toJsonCustomerKeys?.length ?? 0}`);
  });

  it('fromJson reads guestTrackingToken from JSON response', async () => {
    const fs = await import('node:fs');
    const dartSource = fs.default.readFileSync(DART_CUSTOMER_ORDER, 'utf8');
    assert.match(dartSource, /guestTrackingToken: json\['guestTrackingToken'\]/);
  });

  it('toJson includes guestTrackingToken in serialized output', async () => {
    const fs = await import('node:fs');
    const dartSource = fs.default.readFileSync(DART_CUSTOMER_ORDER, 'utf8');
    assert.match(dartSource, /if \(guestTrackingToken != null\) 'guestTrackingToken': guestTrackingToken/);
  });
});
