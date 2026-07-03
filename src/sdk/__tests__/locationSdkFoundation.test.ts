import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  LOCATION_SDK_FEATURE_FLAG_DEFAULTS,
  LOCATION_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../location/core/featureFlags';
import {
  LOCATION_SDK_VERSION,
  LOCATION_SDK_FROZEN,
} from '../location/version';
import { LOCATION_SDK_MODULE } from '../location/shared/constants';
import {
  LOCATION_SDK_VERSION as VERSION_BARREL,
  LOCATION_SDK_FROZEN as FROZEN_BARREL,
  LOCATION_SDK_MODULE as MODULE_BARREL,
  LOCATION_SDK_FEATURE_FLAG_DEFAULTS as DEFAULTS_BARREL,
} from '../location/types';

describe('LocationSDK foundation (M2 PR-2)', () => {
  it('exports LOCATION_SDK_VERSION as 1.0.0-browser-location', () => {
    assert.equal(LOCATION_SDK_VERSION, '1.0.0-browser-location');
    assert.equal(VERSION_BARREL, '1.0.0-browser-location');
  });

  it('exports LOCATION_SDK_FROZEN as false', () => {
    assert.equal(LOCATION_SDK_FROZEN, false);
    assert.equal(FROZEN_BARREL, false);
  });

  it('exports LOCATION_SDK_MODULE as location', () => {
    assert.equal(LOCATION_SDK_MODULE, 'location');
    assert.equal(MODULE_BARREL, 'location');
  });

  it('defaults all location feature flags to off', () => {
    const { flags } = LOCATION_SDK_FEATURE_FLAG_DEFAULTS;
    assert.equal(flags.FF_LOCATION_MAP_ENABLED, false);
    assert.equal(flags.FF_LOCATION_DISCOVERY_ENABLED, false);
    assert.equal(flags.FF_LOCATION_OWNER_REGISTRATION_ENABLED, false);
    assert.equal(flags.FF_LOCATION_CUSTOMER_DETECTION_ENABLED, false);
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(
      LOCATION_SDK_FEATURE_FLAG_ENV_KEYS.FF_LOCATION_MAP_ENABLED,
      'VITE_FF_LOCATION_MAP_ENABLED'
    );
    assert.equal(
      LOCATION_SDK_FEATURE_FLAG_ENV_KEYS.FF_LOCATION_DISCOVERY_ENABLED,
      'VITE_FF_LOCATION_DISCOVERY_ENABLED'
    );
    assert.equal(
      LOCATION_SDK_FEATURE_FLAG_ENV_KEYS.FF_LOCATION_OWNER_REGISTRATION_ENABLED,
      'VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED'
    );
    assert.equal(
      LOCATION_SDK_FEATURE_FLAG_ENV_KEYS.FF_LOCATION_CUSTOMER_DETECTION_ENABLED,
      'VITE_FF_LOCATION_CUSTOMER_DETECTION_ENABLED'
    );
  });
  it('barrel re-exports feature flag defaults', () => {
    assert.deepEqual(
      LOCATION_SDK_FEATURE_FLAG_DEFAULTS.flags,
      DEFAULTS_BARREL.flags
    );
  });
});
