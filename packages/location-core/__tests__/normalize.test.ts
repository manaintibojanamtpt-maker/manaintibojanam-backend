import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  hasConfirmedFlat,
  hasValidDeliveryCoordinates,
  isValidCoordinatePair,
  normalizeAddressText,
  parseDeliveryAddressV2,
  toRoundedCacheKey,
} from '../src/normalize.js';

describe('normalize', () => {
  it('validates coordinate pairs', () => {
    assert.equal(isValidCoordinatePair(18.53, 73.89), true);
    assert.equal(isValidCoordinatePair(0, 0), false);
    assert.equal(isValidCoordinatePair(Number.NaN, 1), false);
  });

  it('normalizes address text with fallback labels', () => {
    const text = normalizeAddressText({ city: 'Pune' });
    assert.equal(text.shortLabel, 'Pune');
    assert.equal(text.formatted, 'Pune');
  });

  it('parses DeliveryAddressV2', () => {
    const parsed = parseDeliveryAddressV2({
      version: 2,
      coordinates: { lat: 18.53, lng: 73.89, source: 'gps', capturedAt: 1 },
      text: { formatted: 'Koregaon Park, Pune', shortLabel: 'Koregaon Park' },
      meta: { provider: 'nominatim', precision: 'nearby', capturedAt: 1 },
    });
    assert.ok(parsed);
    assert.equal(parsed?.coordinates.lat, 18.53);
  });

  it('requires flat confirmation helper', () => {
    const address = parseDeliveryAddressV2({
      version: 2,
      coordinates: { lat: 18.53, lng: 73.89, source: 'gps', capturedAt: 1 },
      text: { formatted: 'Test', shortLabel: 'Test' },
      meta: { provider: 'nominatim', precision: 'approx', capturedAt: 1 },
    });
    assert.equal(hasConfirmedFlat(address), false);
    assert.equal(hasValidDeliveryCoordinates(address), true);
  });

  it('builds rounded cache keys', () => {
    assert.equal(toRoundedCacheKey(18.531234, 73.891234), 'rev:18.53123:73.89123');
  });

  it('rebuilds shortLabel when flat, building, and landmark are confirmed', () => {
    const text = normalizeAddressText({
      shortLabel: 'Koregaon Park',
      formatted: 'Koregaon Park, Pune',
      area: 'Koregaon Park',
      city: 'Pune',
      flat: '402',
      building: 'Green Valley',
      landmark: 'Near gate',
    });

    assert.equal(text.shortLabel, '402, Green Valley, Near gate, Koregaon Park, Pune');
    assert.equal(text.formatted, '402, Green Valley, Near gate, Koregaon Park, Pune');
  });
});
