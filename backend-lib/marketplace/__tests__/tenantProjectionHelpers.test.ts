import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTenantDeliveryFee,
  extractTenantSyncRevision,
  formatHoursLabel,
  isStoreOpenNow,
  mergeSyncRevisions,
  isImplausibleCustomerDistance,
  resolveDeliveryFeeForDisplay,
  resolveKitchenDietaryFromMenuTypes,
  resolveStoreTiming,
  normalizeStoreTimeToHHmm,
} from '../tenantProjectionHelpers.js';
import { parseFirestoreTenant } from '../projectFoodMenuV1.js';
import { projectRestaurantExperience } from '../projectRestaurantExperience.js';

describe('tenantProjectionHelpers', () => {
  it('does not treat unconfigured delivery as free', () => {
    const fee = resolveDeliveryFeeForDisplay({
      enabled: true,
      feesConfigured: false,
      baseFee: 0,
      perKmCharge: 0,
      maxRadius: 10,
    });
    assert.equal(fee, undefined);
  });

  it('infers pure veg kitchen from menu types', () => {
    assert.equal(
      resolveKitchenDietaryFromMenuTypes(['veg', 'veg']),
      'pure_veg',
    );
    assert.equal(
      resolveKitchenDietaryFromMenuTypes(['veg', 'non-veg']),
      'veg_friendly',
    );
  });

  it('flags implausible default demo distance', () => {
    assert.equal(isImplausibleCustomerDistance(476.9), true);
    assert.equal(isImplausibleCustomerDistance(4.2), false);
  });

  it('formats owner store hours from storeOperations', () => {
    const raw = {
      slug: 'demo',
      name: 'Demo',
      storeOperations: {
        businessHoursEnabled: true,
        openTime: '09:00',
        closeTime: '22:30',
      },
    };
    const tenant = parseFirestoreTenant('demo', raw);
    const timing = resolveStoreTiming(tenant, raw);
    assert.equal(formatHoursLabel(timing.openTime, timing.closeTime), '9:00 AM – 10:30 PM');
  });

  it('computes delivery fee only inside max radius when configured', () => {
    const config = {
      enabled: true,
      feesConfigured: true,
      freeRadius: 3,
      paidRadius: 10,
      maxRadius: 10,
      baseFee: 25,
      perKmCharge: 5,
    };
    assert.equal(computeTenantDeliveryFee(2, config), 0);
    assert.equal(computeTenantDeliveryFee(8, config), 25);
    assert.equal(computeTenantDeliveryFee(12, config), -1);
  });

  it('mana-inti: base fee within paid radius, per-km beyond 7 km', () => {
    const config = {
      enabled: true,
      feesConfigured: true,
      freeRadius: 2,
      paidRadius: 7,
      maxRadius: 15,
      baseFee: 40,
      perKmCharge: 10,
    };
    assert.equal(computeTenantDeliveryFee(1.5, config), 0);
    assert.equal(computeTenantDeliveryFee(5.9, config), 40);
    assert.equal(computeTenantDeliveryFee(10, config), 70);
  });

  it('extracts tenant sync revision from storeOperations.updatedAt first', () => {
    const raw = {
      updatedAt: '2026-06-01T10:00:00.000Z',
      storeOperations: { updatedAt: '2026-06-02T12:00:00.000Z' },
    };
    assert.equal(extractTenantSyncRevision(raw), '2026-06-02T12:00:00.000Z');
    assert.equal(
      mergeSyncRevisions('2026-06-01T10:00:00.000Z', '2026-06-03T08:00:00.000Z'),
      '2026-06-03T08:00:00.000Z',
    );
  });

  it('uses Asia/Kolkata for business hours instead of server local time', () => {
    const timing = resolveStoreTiming(
      {
        storeOperations: {
          isStoreOpen: true,
          businessHoursEnabled: true,
          openTime: '09:00',
          closeTime: '22:00',
        },
      } as never,
      {},
    );

    const lunchIst = new Date('2026-07-09T08:43:00.000Z');
    assert.equal(isStoreOpenNow(timing, lunchIst), true);

    const openBoundary = new Date('2026-07-09T03:30:00.000Z');
    assert.equal(isStoreOpenNow(timing, openBoundary), true);

    const beforeOpen = new Date('2026-07-09T02:00:00.000Z');
    assert.equal(isStoreOpenNow(timing, beforeOpen), false);
  });

  it('normalizes 12-hour owner store hours for open/close checks', () => {
    const timing = resolveStoreTiming(
      {
        storeOperations: {
          isStoreOpen: true,
          businessHoursEnabled: true,
          openTime: '11:00 AM',
          closeTime: '11:00 PM',
        },
      } as never,
      {},
    );

    assert.equal(normalizeStoreTimeToHHmm('11:00 AM'), '11:00');
    assert.equal(normalizeStoreTimeToHHmm('11:00 PM'), '23:00');

    const dinnerIst = new Date('2026-07-11T17:14:00.000Z');
    assert.equal(isStoreOpenNow(timing, dinnerIst), true);

    const afterClose = new Date('2026-07-11T18:31:00.000Z');
    assert.equal(isStoreOpenNow(timing, afterClose), false);
  });
});

describe('projectRestaurantExperience tenant sync', () => {
  it('hides misleading Hyderabad→Pune distance and unconfigured free delivery', () => {
    const raw = {
      slug: 'inti-bhojanam-ghar-kha-khana-pune',
      name: 'Inti bhojanam Ghar kha Khana pune',
      location: { lat: 18.5285, lng: 73.9871, city: 'Pune' },
      deliveryConfig: {
        enabled: true,
        feesConfigured: false,
        baseFee: 0,
        prepTime: 20,
        maxRadius: 10,
      },
      storeOperations: {
        businessHoursEnabled: true,
        openTime: '09:00',
        closeTime: '22:30',
      },
    };
    const tenant = parseFirestoreTenant('inti-bhojanam-ghar-kha-khana-pune', raw);

    const payload = projectRestaurantExperience({
      tenant,
      raw,
      contextToken: 'test',
      customerCoords: { lat: 17.44, lng: 78.35 },
      menuTypes: ['veg', 'veg'],
    });

    assert.equal(payload.experience.distance, undefined);
    assert.equal(payload.experience.deliveryFeeKnown, false);
    assert.equal(payload.experience.kitchenDietary, 'pure_veg');
    assert.match(payload.hours[0]?.open ?? '', /9:00 AM/);
  });
});
