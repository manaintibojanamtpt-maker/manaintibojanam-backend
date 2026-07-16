import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkLocationServiceability,
  toMarketplaceServiceabilityResult,
} from '../serviceability.js';

describe('backend serviceability', () => {
  it('computes serviceability with kitchen config', () => {
    const result = checkLocationServiceability({
      lat: 18.531,
      lng: 73.891,
      kitchenId: 'demo',
      kitchenLat: 18.53,
      kitchenLng: 73.89,
      deliveryConfig: {
        freeRadius: 2,
        paidRadius: 5,
        maxRadius: 8,
        baseFee: 30,
        perKmCharge: 10,
      },
    });

    assert.equal(result.isServiceable, true);
    assert.equal(result.currency, 'INR');
  });

  it('maps to marketplace response shape', () => {
    const mapped = toMarketplaceServiceabilityResult({
      isServiceable: true,
      distanceKm: 4,
      deliveryFee: 30,
      currency: 'INR',
      reason: 'OK',
    }, 25);

    assert.equal(mapped.delivery, true);
    assert.equal(mapped.etaMinutes?.min, 37);
  });

  it('maps unserviceable locations without ETA', () => {
    const mapped = toMarketplaceServiceabilityResult({
      isServiceable: false,
      distanceKm: 12,
      deliveryFee: 0,
      currency: 'INR',
      reason: 'OUT_OF_RADIUS',
    });

    assert.equal(mapped.delivery, false);
    assert.equal(mapped.etaMinutes, undefined);
    assert.match(mapped.message ?? '', /Outside delivery area/i);
  });
});
