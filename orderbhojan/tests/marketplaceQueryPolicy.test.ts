import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMarketplaceQueryBehavior,
  isLiveStorefrontSyncEnabled,
  MARKETPLACE_LIVE_REFETCH_INTERVAL_MS,
  MARKETPLACE_LIVE_STALE_TIME_MS,
  MARKETPLACE_MOCK_STALE_TIME_MS,
  shouldBypassMarketplaceHttpCache,
} from '../src/config/marketplaceQueryPolicy';

describe('marketplaceQueryPolicy', () => {
  it('uses warm cache defaults when live Firestore sync is off', () => {
    assert.equal(isLiveStorefrontSyncEnabled(), false);
    assert.equal(shouldBypassMarketplaceHttpCache(), false);
    const behavior = getMarketplaceQueryBehavior();
    assert.equal(behavior.staleTime, MARKETPLACE_MOCK_STALE_TIME_MS);
    assert.equal(behavior.refetchInterval, false);
    assert.equal(behavior.refetchOnWindowFocus, false);
  });

  it('documents revision-driven sync interval target', () => {
    assert.equal(MARKETPLACE_LIVE_STALE_TIME_MS, 30_000);
    assert.equal(MARKETPLACE_LIVE_REFETCH_INTERVAL_MS, 5_000);
  });
});
