import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeDeliveryAddressFields,
  resolveOrderAddressText,
} from '../deliveryAddressFields.js';

describe('deliveryAddressFields', () => {
  it('stores human-readable address from displayLabel', () => {
    const normalized = normalizeDeliveryAddressFields({
      lat: 17.44,
      lng: 78.34,
      displayLabel: '12, Green Homes, Near temple, Madhapur',
      distanceKm: 2.4,
    });

    assert.equal(normalized.address, '12, Green Homes, Near temple, Madhapur');
    assert.equal(normalized.deliveryAddress?.addressLine1, '12, Green Homes, Near temple, Madhapur');
    assert.equal(normalized.deliveryAddress?.lat, 17.44);
  });

  it('reads legacy object address fields on orders', () => {
    const text = resolveOrderAddressText(
      { lat: 17.44, lng: 78.34 },
      { displayLabel: 'Saved delivery point' },
    );
    assert.equal(text, 'Saved delivery point');
  });
});
