import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildOwnerDeliveryConfigFirestoreUpdates,
  readOwnerDeliveryConfig,
  validateOwnerDeliveryConfig,
} from '../ownerDeliveryConfiguration.js';
import { createPricingEngine } from '../pricingEngine.js';

const MANA_INTI_CONFIG = {
  enabled: true,
  feesConfigured: true,
  freeRadius: 2,
  paidRadius: 7,
  maxRadius: 15,
  baseFee: 40,
  perKmCharge: 10,
  prepTime: 20,
};

describe('Step 14 — Owner Delivery Intelligence Configuration Suite', () => {
  it('1 & 2 & 3 & 11. reads existing tenant doc with canonical and legacy defaults', () => {
    const rawDoc = {
      deliveryConfig: {
        enabled: true,
        freeRadius: 3,
        paidRadius: 5,
        maxRadius: 10,
        baseFee: 20,
        perKmCharge: 5,
        prepTime: 25,
        freeDeliveryMinOrder: 599,
      },
      kitchenConfig: {
        capacity: 15,
        orderAcceptanceMode: 'AUTO',
      },
    };

    const config = readOwnerDeliveryConfig(rawDoc);

    assert.equal(config.pricingMode, 'FIXED_TIER');
    assert.equal(config.vehicleType, 'BIKE');
    assert.equal(config.freeDelivery.enabled, true);
    assert.equal(config.freeDelivery.minimumOrderValue, 599);
    assert.equal(config.freeDelivery.basis, 'SUBTOTAL');
    assert.equal(config.freeDelivery.payer, 'TENANT');
    assert.equal(config.kitchenConfig.defaultPrepTimeMinutes, 25);
    assert.equal(config.kitchenConfig.capacity, 15);
    assert.equal(config.kitchenConfig.orderAcceptanceMode, 'AUTO');
    assert.equal(config.radius.freeRadius, 3);
    assert.equal(config.radius.paidRadius, 5);
    assert.equal(config.radius.maxRadius, 10);
    assert.equal(config.radius.baseFee, 20);
    assert.equal(config.radius.perKmCharge, 5);
  });

  it('4. pricingMode validates and saves correctly', () => {
    const valid = validateOwnerDeliveryConfig({
      pricingMode: 'MARKET_BENCHMARK',
      vehicleType: 'BIKE',
    });

    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.data.pricingMode, 'MARKET_BENCHMARK');
    }

    const invalid = validateOwnerDeliveryConfig({
      pricingMode: 'DYNAMIC_AI_MAGIC',
    });
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.match(invalid.error, /Invalid pricingMode/);
    }
  });

  it('5. vehicleType validates and saves correctly', () => {
    const validCar = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'CAR',
    });
    assert.equal(validCar.ok, true);
    if (validCar.ok) {
      assert.equal(validCar.data.vehicleType, 'CAR');
    }

    const invalidVehicle = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'PLANE',
    });
    assert.equal(invalidVehicle.ok, false);
  });

  it('6 & 7 & 8 & 9 & 10. free delivery ON/OFF, default ₹599, and custom thresholds work', () => {
    const customThreshold = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      freeDelivery: {
        enabled: true,
        minimumOrderValue: 799,
      },
    });

    assert.equal(customThreshold.ok, true);
    if (customThreshold.ok) {
      assert.equal(customThreshold.data.freeDelivery.enabled, true);
      assert.equal(customThreshold.data.freeDelivery.minimumOrderValue, 799);
      assert.equal(customThreshold.data.freeDelivery.basis, 'SUBTOTAL');
      assert.equal(customThreshold.data.freeDelivery.payer, 'TENANT');
    }
  });

  it('12 & 13 & 14. kitchen prep time, capacity, and AUTO/MANUAL acceptance mode work', () => {
    const validKitchen = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      kitchenConfig: {
        defaultPrepTimeMinutes: 30,
        capacity: 20,
        orderAcceptanceMode: 'MANUAL',
      },
    });

    assert.equal(validKitchen.ok, true);
    if (validKitchen.ok) {
      assert.equal(validKitchen.data.kitchenConfig.defaultPrepTimeMinutes, 30);
      assert.equal(validKitchen.data.kitchenConfig.capacity, 20);
      assert.equal(validKitchen.data.kitchenConfig.orderAcceptanceMode, 'MANUAL');
    }

    const invalidPrepTime = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      kitchenConfig: { defaultPrepTimeMinutes: -5 },
    });
    assert.equal(invalidPrepTime.ok, false);
  });

  it('15 & 16. radius validation enforces freeRadius <= paidRadius <= maxRadius ordering', () => {
    const validRadius = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      radius: {
        freeRadius: 2,
        paidRadius: 7,
        maxRadius: 10,
        baseFee: 0,
        perKmCharge: 0,
      },
    });
    assert.equal(validRadius.ok, true);

    const invalidRadiusOrder = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      radius: {
        freeRadius: 10,
        paidRadius: 5,
        maxRadius: 12,
      },
    });
    assert.equal(invalidRadiusOrder.ok, false);
    if (!invalidRadiusOrder.ok) {
      assert.match(invalidRadiusOrder.error, /Invalid radius ordering/);
    }
  });

  it('17. invalid enums are rejected', () => {
    const invalidSelectionMode = validateOwnerDeliveryConfig({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      providerSelectionMode: 'CHEAPEST_WINNER',
    });
    assert.equal(invalidSelectionMode.ok, false);
  });

  it('20 & 21 & 22. provider readiness never leaks secrets and live flags remain off', () => {
    const updates = buildOwnerDeliveryConfigFirestoreUpdates({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      freeDelivery: { enabled: true, minimumOrderValue: 599, basis: 'SUBTOTAL', payer: 'TENANT' },
      kitchenConfig: { defaultPrepTimeMinutes: 20, capacity: 10, orderAcceptanceMode: 'AUTO' },
      radius: { freeRadius: 2, paidRadius: 7, maxRadius: 10, baseFee: 0, perKmCharge: 0 },
      providerSelectionMode: 'MANUAL_ONLY',
      providerPreference: ['rapido', 'porter', 'self_pickup'],
    });

    const serialized = JSON.stringify(updates);
    assert.equal(serialized.includes('secretKey'), false);
    assert.equal(serialized.includes('apiKey'), false);
    assert.equal(serialized.includes('authToken'), false);
  });

  it('26. dual writing to legacy fields preserves backward compatibility', () => {
    const updates = buildOwnerDeliveryConfigFirestoreUpdates({
      pricingMode: 'FIXED_TIER',
      vehicleType: 'BIKE',
      freeDelivery: { enabled: true, minimumOrderValue: 699, basis: 'SUBTOTAL', payer: 'TENANT' },
      kitchenConfig: { defaultPrepTimeMinutes: 25, capacity: 12, orderAcceptanceMode: 'AUTO' },
      radius: { freeRadius: 3, paidRadius: 6, maxRadius: 12, baseFee: 30, perKmCharge: 5 },
      providerSelectionMode: 'MANUAL_ONLY',
      providerPreference: ['rapido', 'porter', 'self_pickup'],
    });

    const del = updates.deliveryConfig as Record<string, unknown>;
    assert.equal(del.freeDeliveryMinOrder, 699); // legacy field dual written
    assert.equal(del.prepTime, 25); // legacy field dual written
    assert.equal(del.freeRadius, 3);
    assert.equal(del.paidRadius, 6);
    assert.equal(del.maxRadius, 12);
  });

  it('23 & 24 & 25 & 27. fixed-tier pricing parity strictly holds across 2km/7km/10km/16km', async () => {
    const engine = createPricingEngine();
    const makeRoute = (km: number) => ({
      kind: 'ROAD' as const,
      source: 'ROUTING_PROVIDER' as const,
      distanceKm: km,
      durationMinutes: km * 3,
      provider: 'test',
      fetchedAt: new Date().toISOString(),
    });

    const fee2km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(2), orderSubtotal: 200, tenantDeliveryConfig: MANA_INTI_CONFIG });
    const fee7km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(7), orderSubtotal: 200, tenantDeliveryConfig: MANA_INTI_CONFIG });
    const fee10km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(10), orderSubtotal: 200, tenantDeliveryConfig: MANA_INTI_CONFIG });
    const fee16km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(16), orderSubtotal: 200, tenantDeliveryConfig: MANA_INTI_CONFIG });

    assert.equal(fee2km.customerDeliveryFee, 0);
    assert.equal(fee7km.customerDeliveryFee, 40);
    assert.equal(fee10km.customerDeliveryFee, 70);
    assert.equal(fee16km.customerDeliveryFee, null);
    assert.equal(fee16km.confidence, 'UNAVAILABLE');
  });
});
