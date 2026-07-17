import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_DISPLAY_DISTANCE_KM,
  areCoordsNearlyEqual,
  computeCustomerDistanceKm,
  resolveCustomerDistanceKm,
  toDisplayDistanceKm,
} from '../customerDistance.js';
import { projectRestaurantPublic } from '../projectDiscovery.js';
import { parseFirestoreTenant } from '../projectFoodMenuV1.js';

describe('customerDistance', () => {
  it('returns undefined for identical customer and kitchen coords', () => {
    const result = resolveCustomerDistanceKm(
      { lat: 18.499594, lng: 73.978589 },
      { lat: 18.499594, lng: 73.978589 },
    );
    assert.equal(result.rawKm, undefined);
    assert.equal(result.displayKm, undefined);
  });

  it('detects nearly-equal coords within epsilon', () => {
    assert.equal(areCoordsNearlyEqual(18.5, 73.97, 18.50001, 73.97001), true);
    assert.equal(areCoordsNearlyEqual(18.5, 73.97, 18.51, 73.98), false);
  });

  it('rounds sub-100m distances to 0.0 km display', () => {
    assert.equal(toDisplayDistanceKm(0.04), 0);
    assert.equal(toDisplayDistanceKm(0.049), 0);
  });

  it('does not collapse displayable distances to zero after rounding', () => {
    assert.equal(toDisplayDistanceKm(0.06), 0.1);
    assert.equal(toDisplayDistanceKm(4.04), 4);
  });

  it('computes haversine distance for Koregaon Park to Inti kitchen fixture', () => {
    const raw = computeCustomerDistanceKm(18.5362, 73.8958, 18.5285, 73.9871);
    assert.ok(raw != null && raw > 8 && raw < 11);
  });
});

describe('projectRestaurantPublic distance', () => {
  it('omits distance when customer coords match kitchen (default-coord collision)', () => {
    const coords = { lat: 18.49959440695956, lng: 73.97858993491619 };
    const tenant = parseFirestoreTenant('inti-bhojanam-ghar-kha-khana-pune', {
      slug: 'inti-bhojanam-ghar-kha-khana-pune',
      name: 'Inti bhojanam',
      location: coords,
      deliveryConfig: {
        enabled: true,
        feesConfigured: true,
        baseFee: 25,
        perKmCharge: 5,
        maxRadius: 15,
      },
    });
    const restaurant = projectRestaurantPublic(tenant, { location: coords }, coords);
    assert.equal(restaurant.distanceKm, undefined);
  });

  it('returns consistent distance for separated coords', () => {
    const tenant = parseFirestoreTenant('lucky', {
      slug: 'lucky-s-kitchen',
      name: "Lucky's Kitchen",
      location: { lat: 18.5285, lng: 73.9871 },
      deliveryConfig: { enabled: true, feesConfigured: true, baseFee: 20, maxRadius: 12 },
    });
    const restaurant = projectRestaurantPublic(
      tenant,
      {},
      { lat: 18.5362, lng: 73.8958 },
    );
    assert.ok(restaurant.distanceKm != null && restaurant.distanceKm > 8);
    assert.ok(restaurant.etaMinutes != null && restaurant.etaMinutes.min >= 25);
  });
});
