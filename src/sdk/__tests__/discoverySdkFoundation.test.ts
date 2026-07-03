import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS,
  DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../discovery/core/featureFlags';
import { DISCOVERY_RANKING_WEIGHTS } from '../discovery/ranking/RankingEngine';
import {
  DISCOVERY_SDK_FROZEN,
  DISCOVERY_SDK_MODULE,
  DISCOVERY_SDK_VERSION,
} from '../discovery/version';
import {
  DISCOVERY_SDK_FROZEN as FROZEN_BARREL,
  DISCOVERY_SDK_MODULE as MODULE_BARREL,
  DISCOVERY_SDK_VERSION as VERSION_BARREL,
} from '../discovery/types/index';

describe('DiscoverySDK foundation (M3 PR-1)', () => {
  it('exports DISCOVERY_SDK_VERSION as 0.6.0-geoindex', () => {
    assert.equal(DISCOVERY_SDK_VERSION, '0.6.0-geoindex');
    assert.equal(VERSION_BARREL, '0.6.0-geoindex');
  });

  it('exports DISCOVERY_SDK_FROZEN as false', () => {
    assert.equal(DISCOVERY_SDK_FROZEN, false);
    assert.equal(FROZEN_BARREL, false);
  });

  it('exports DISCOVERY_SDK_MODULE as discovery', () => {
    assert.equal(DISCOVERY_SDK_MODULE, 'discovery');
    assert.equal(MODULE_BARREL, 'discovery');
  });

  it('defaults all discovery feature flags to off', () => {
    assert.equal(DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DISCOVERY_ENABLED, false);
    assert.equal(DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DISCOVERY_RANKING_ENABLED, false);
    assert.equal(DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DISCOVERY_MARKETPLACE_ENABLED, false);
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DISCOVERY_TENANT_REPOSITORY_ENABLED,
      false
    );
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DISCOVERY_ELIGIBILITY_ENABLED,
      false
    );
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_DISCOVERY_GEOINDEX_ENABLED,
      false
    );
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS.FF_DISCOVERY_ENABLED, 'VITE_FF_DISCOVERY_ENABLED');
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS.FF_DISCOVERY_RANKING_ENABLED,
      'VITE_FF_DISCOVERY_RANKING_ENABLED'
    );
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS.FF_DISCOVERY_MARKETPLACE_ENABLED,
      'VITE_FF_DISCOVERY_MARKETPLACE_ENABLED'
    );
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS.FF_DISCOVERY_TENANT_REPOSITORY_ENABLED,
      'VITE_FF_DISCOVERY_TENANT_REPOSITORY_ENABLED'
    );
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS.FF_DISCOVERY_ELIGIBILITY_ENABLED,
      'VITE_FF_DISCOVERY_ELIGIBILITY_ENABLED'
    );
    assert.equal(
      DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS.FF_DISCOVERY_GEOINDEX_ENABLED,
      'VITE_FF_DISCOVERY_GEOINDEX_ENABLED'
    );
  });

  it('defines ranking weights that sum to 1.0 for active factors', () => {
    const sum =
      DISCOVERY_RANKING_WEIGHTS.distance +
      DISCOVERY_RANKING_WEIGHTS.deliveryRadius +
      DISCOVERY_RANKING_WEIGHTS.kitchenOpen +
      DISCOVERY_RANKING_WEIGHTS.storeAvailability +
      DISCOVERY_RANKING_WEIGHTS.preparationTime +
      DISCOVERY_RANKING_WEIGHTS.deliveryEta +
      DISCOVERY_RANKING_WEIGHTS.cuisineMatch +
      DISCOVERY_RANKING_WEIGHTS.rating;
    assert.equal(sum, 1);
    assert.equal(DISCOVERY_RANKING_WEIGHTS.promoted, 0);
    assert.equal(DISCOVERY_RANKING_WEIGHTS.aiRecommendation, 0);
  });
});
