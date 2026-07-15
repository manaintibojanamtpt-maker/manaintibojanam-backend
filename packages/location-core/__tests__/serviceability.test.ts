import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeServiceability } from '../src/serviceability.js';

describe('serviceability', () => {
  const config = {
    kitchenId: 'kitchen-1',
    kitchenLat: 18.53,
    kitchenLng: 73.89,
    freeRadiusKm: 2,
    baseRadiusKm: 5,
    maxRadiusKm: 8,
    baseFee: 30,
    perKmExtraCharge: 10,
  };

  it('returns free delivery within free radius', () => {
    const result = computeServiceability(config, 18.531, 73.891);
    assert.equal(result.isServiceable, true);
    assert.equal(result.deliveryFee, 0);
    assert.equal(result.reason, 'OK');
  });

  it('returns base fee within paid radius', () => {
    const result = computeServiceability(config, 18.55, 73.92);
    assert.equal(result.isServiceable, true);
    assert.equal(result.deliveryFee, 30);
  });

  it('marks out of radius as unserviceable', () => {
    const result = computeServiceability(config, 19.0, 74.5);
    assert.equal(result.isServiceable, false);
    assert.equal(result.reason, 'OUT_OF_RADIUS');
    assert.equal(result.deliveryFee, 0);
  });
});
