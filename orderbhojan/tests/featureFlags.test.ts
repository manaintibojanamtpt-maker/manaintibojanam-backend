import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';

describe('featureFlags', () => {
  it('defaults all OrderBhojan flags to OFF', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_DISCOVERY'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_SEARCH'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_RESTAURANT'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_MENU'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_CONTRACT_V1'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_FIRESTORE'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_TRACKING'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_NOTIFICATIONS'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_PAYMENTS'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_PROMOTIONS'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_LOCATION_ENABLED'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_LOCATION_GEOCODE_API'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_LOCATION_MAP_ENABLED'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_VOICE_TTS'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_POST_ORDER'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_CANARY_HEADERS'), false);
  });
});
