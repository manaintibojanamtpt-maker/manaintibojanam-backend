import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canProceedToCheckoutWithLocation,
  needsFlatConfirmationBeforeCheckout,
  resolveDeliveryLocationGate,
} from '../src/readiness.ts';
import { normalizeAddressText } from '../src/normalize.ts';
import type { DeliveryAddressV2 } from '../src/types.ts';

function sampleAddress(overrides?: Partial<DeliveryAddressV2['text']>): DeliveryAddressV2 {
  return {
    version: 2,
    coordinates: {
      lat: 18.54,
      lng: 73.89,
      source: 'gps',
      capturedAt: Date.now(),
    },
    text: normalizeAddressText({
      formatted: 'Koregaon Park, Pune',
      shortLabel: 'Koregaon Park',
      ...overrides,
    }),
    meta: {
      provider: 'nominatim',
      precision: 'approx',
      capturedAt: Date.now(),
    },
  };
}

describe('delivery location readiness', () => {
  it('blocks when coordinates are missing', () => {
    assert.equal(resolveDeliveryLocationGate(null), 'no_coords');
    assert.equal(canProceedToCheckoutWithLocation(null), false);
  });

  it('requires flat confirmation when coordinates exist without flat', () => {
    const address = sampleAddress();
    assert.equal(resolveDeliveryLocationGate(address), 'needs_flat');
    assert.equal(needsFlatConfirmationBeforeCheckout(address), true);
    assert.equal(canProceedToCheckoutWithLocation(address), false);
  });

  it('allows checkout when coordinates and flat are confirmed', () => {
    const address = sampleAddress({ flat: '402' });
    assert.equal(resolveDeliveryLocationGate(address), 'ready');
    assert.equal(canProceedToCheckoutWithLocation(address), true);
  });
});
