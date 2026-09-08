import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkMarketplaceServiceability,
  reverseGeocodeMarketplace,
  validateMarketplacePincode,
} from '../projectLocation.js';

describe('projectLocation', () => {
  it('reverse geocodes Hyderabad coordinates', () => {
    const result = reverseGeocodeMarketplace(17.44, 78.35);
    assert.match(result.displayLabel, /Hyderabad/);
    assert.equal(result.confidence, 'high');
  });

  it('validates Indian pincode format', () => {
    const valid = validateMarketplacePincode('500032');
    assert.equal(valid.valid, true);
    const invalid = validateMarketplacePincode('000000');
    assert.equal(invalid.valid, false);
  });

  it('checks serviceability for non-zero coordinates', () => {
    const result = checkMarketplaceServiceability({ lat: 17.44, lng: 78.35 });
    assert.equal(result.delivery, true);
    assert.equal(result.pickup, true);
  });

  it('loadTenantDocBySlug strips obr_ prefix', async () => {
    const { loadTenantDocBySlug } = await import('../marketplaceTenantLoader.js');
    const mockDb = {
      collection: (name: string) => ({
        doc: (id: string) => ({
          get: async () => ({ exists: id === 'demo-store', id, data: () => ({ name: 'Demo' }) }),
        }),
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: true, docs: [] }),
          }),
        }),
      }),
    } as any;

    const found = await loadTenantDocBySlug(mockDb, 'obr_demo-store');
    assert.ok(found);
    assert.equal(found.id, 'demo-store');
  });
});
