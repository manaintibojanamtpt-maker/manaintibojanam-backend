import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildCustomerGeoIndexPrefixes,
  encodeCustomerGeohash,
} from '../geoIndexFirestore.js';
import { isMarketplaceGeoIndexEnabled } from '../marketplaceGeoIndexPolicy.js';

describe('marketplace geoIndex discovery', () => {
  it('encodes Pune customer coordinates to geohash prefixes', () => {
    const geohash = encodeCustomerGeohash(18.5204, 73.8567);
    assert.ok(geohash);
    assert.ok(geohash!.length >= 6);

    const prefixes = buildCustomerGeoIndexPrefixes(18.5204, 73.8567);
    assert.ok(prefixes.length >= 2);
    assert.equal(prefixes[0]?.length, 6);
  });

  it('is enabled unless FF_MARKETPLACE_GEOINDEX=false', () => {
    const previous = process.env.FF_MARKETPLACE_GEOINDEX;
    delete process.env.FF_MARKETPLACE_GEOINDEX;
    assert.equal(isMarketplaceGeoIndexEnabled(), true);
    process.env.FF_MARKETPLACE_GEOINDEX = 'false';
    assert.equal(isMarketplaceGeoIndexEnabled(), false);
    if (previous === undefined) {
      delete process.env.FF_MARKETPLACE_GEOINDEX;
    } else {
      process.env.FF_MARKETPLACE_GEOINDEX = previous;
    }
  });

  it('wires geoIndex into discovery load and tenant sync', () => {
    const root = process.cwd();
    const discoverySource = fs.readFileSync(
      path.join(root, 'backend-lib/marketplace/projectDiscovery.ts'),
      'utf8',
    );
    assert.match(discoverySource, /loadMarketplaceRestaurantsFromGeoIndex/);
    assert.match(discoverySource, /resolveNearbyTenantIds/);

    const syncSource = fs.readFileSync(
      path.join(root, 'backend-lib/marketplace/tenantSyncService.ts'),
      'utf8',
    );
    assert.match(syncSource, /syncTenantGeoIndexEntry/);

    const rulesSource = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
    assert.match(rulesSource, /match \/geoIndex\//);
  });
});
