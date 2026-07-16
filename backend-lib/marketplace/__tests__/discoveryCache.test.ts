import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearDiscoveryPoolCache,
  getCachedDiscoveryPool,
  setCachedDiscoveryPool,
  toDiscoveryPoolCacheKey,
} from '../discoveryCache.js';

describe('discoveryCache', () => {
  it('rounds coords to ~110 m grid for pool cache keys', () => {
    assert.equal(toDiscoveryPoolCacheKey(18.4995, 73.9785), 'pool:18.500:73.978');
    assert.equal(toDiscoveryPoolCacheKey(18.4994, 73.9784), 'pool:18.499:73.978');
  });

  it('stores and returns cached pool entries', () => {
    clearDiscoveryPoolCache();
    const key = toDiscoveryPoolCacheKey(18.5, 73.97);
    assert.equal(getCachedDiscoveryPool(key), null);
    setCachedDiscoveryPool(key, { restaurants: [], poolSyncRevision: 'rev-1' });
    assert.deepEqual(getCachedDiscoveryPool(key), {
      restaurants: [],
      poolSyncRevision: 'rev-1',
    });
    clearDiscoveryPoolCache();
  });
});
