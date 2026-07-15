import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  migrateLegacyFounderState,
  migrateLegacyObGuestState,
  migrateLegacyOrderBhojanState,
} from '../src/migrate.js';

describe('migrate', () => {
  it('migrates founder mana-delivery-state shape', () => {
    const migrated = migrateLegacyFounderState({
      selectedAddress: {
        lat: 18.53,
        lng: 73.89,
        houseNumber: '12A',
        buildingName: 'Tower',
        landmark: 'Near park',
        distanceKm: 2.1,
        deliveryFee: 30,
      },
    });

    assert.ok(migrated);
    assert.equal(migrated?.version, 2);
    assert.equal(migrated?.text.flat, '12A');
    assert.equal(migrated?.serviceability?.deliveryFee, 30);
  });

  it('migrates OrderBhojan active location', () => {
    const migrated = migrateLegacyOrderBhojanState({
      kind: 'session',
      displayLabel: 'Koregaon Park',
      coordinates: {
        lat: 18.53,
        lng: 73.89,
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
    });

    assert.ok(migrated);
    assert.equal(migrated?.text.shortLabel, 'Koregaon Park');
    assert.equal(migrated?.coordinates.source, 'gps');
  });

  it('migrates guest location v1', () => {
    const migrated = migrateLegacyObGuestState({
      coordinates: {
        lat: 18.53,
        lng: 73.89,
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
      displayLabel: 'Guest location',
    });

    assert.ok(migrated);
    assert.equal(migrated?.text.shortLabel, 'Guest location');
  });
});
