import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildMarketplaceQuote } from '../projectCheckout.js';
import {
  computeTenantDeliveryFee,
  haversineKm,
  resolveDeliveryFeeForDisplay,
} from '../tenantProjectionHelpers.js';

/** Owner storefront settings for mana-inti / manaintibojanam (Jul 2026). */
const MANA_INTI_DELIVERY_CONFIG = {
  enabled: true,
  feesConfigured: true,
  freeRadius: 2,
  paidRadius: 7,
  maxRadius: 15,
  baseFee: 40,
  perKmCharge: 10,
  prepTime: 40,
} as const;

/** Pari Residency, Manjari BK — production kitchen fixture used in distance tests. */
const MANA_INTI_KITCHEN = { lat: 18.5285, lng: 73.9871 };

/** Iris society, Magarpatta City, Keshav Nagar — customer checkout address. */
const IRIS_MAGARPATTA = { lat: 18.5189, lng: 73.9322 };

describe('mana-inti delivery fee parity', () => {
  const irisDistanceKm = haversineKm(
    MANA_INTI_KITCHEN.lat,
    MANA_INTI_KITCHEN.lng,
    IRIS_MAGARPATTA.lat,
    IRIS_MAGARPATTA.lng,
  );

  it('computes ~5.9 km straight-line distance Iris → Manjari kitchen', () => {
    assert.ok(irisDistanceKm > 5.5 && irisDistanceKm < 6.5, `distance=${irisDistanceKm}`);
  });

  it('charges base fee inside paid radius (not per-km from free radius)', () => {
    const fee = computeTenantDeliveryFee(irisDistanceKm, MANA_INTI_DELIVERY_CONFIG);
    assert.equal(fee, 40);
  });

  it('matches discovery/restaurant display fee for Iris address', () => {
    const displayFee = resolveDeliveryFeeForDisplay(MANA_INTI_DELIVERY_CONFIG, irisDistanceKm);
    assert.equal(displayFee, 40);
  });

  it('does not reproduce the old checkout bug (₹78–79 at ~5.9 km)', () => {
    const buggyFee = Math.round(
      MANA_INTI_DELIVERY_CONFIG.baseFee +
        Math.max(0, irisDistanceKm - MANA_INTI_DELIVERY_CONFIG.freeRadius) *
          MANA_INTI_DELIVERY_CONFIG.perKmCharge,
    );
    assert.ok(buggyFee >= 78 && buggyFee <= 79, `buggyFee=${buggyFee}`);
    assert.notEqual(computeTenantDeliveryFee(irisDistanceKm, MANA_INTI_DELIVERY_CONFIG), buggyFee);
  });

  it('adds per-km only beyond paid radius (7 km)', () => {
    assert.equal(computeTenantDeliveryFee(2, MANA_INTI_DELIVERY_CONFIG), 0);
    assert.equal(computeTenantDeliveryFee(7, MANA_INTI_DELIVERY_CONFIG), 40);
    assert.equal(computeTenantDeliveryFee(10, MANA_INTI_DELIVERY_CONFIG), 70);
    assert.equal(computeTenantDeliveryFee(16, MANA_INTI_DELIVERY_CONFIG), -1);
  });

  it('projectCheckout uses shared tenant delivery fee helper', () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), 'backend-lib/marketplace/projectCheckout.ts'),
      'utf8',
    );
    assert.match(source, /computeTenantDeliveryFee/);
    assert.doesNotMatch(source, /distanceKm - freeRadius\)/);
  });

  it('buildMarketplaceQuote returns ₹40 delivery for Iris Magarpatta checkout', async () => {
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
                        deliveryConfig: MANA_INTI_DELIVERY_CONFIG,
                        pricingConfig: { packingFee: 10, gstPercent: 0 },
                        location: MANA_INTI_KITCHEN,
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
                    data: () => ({ price: 338, name: 'Thali', isAvailable: true }),
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
      orderType: 'delivery',
      lines: [{ itemId: menuItemId, quantity: 1 }],
      deliveryAddress: IRIS_MAGARPATTA,
    });

    assert.equal(quote.packagingFee, 10);
    assert.equal(quote.deliveryFee, 40);
    assert.equal(quote.grandTotal, 388);
  });
});
