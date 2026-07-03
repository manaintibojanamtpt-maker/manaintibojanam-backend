import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  SEARCH_SDK_FEATURE_FLAG_DEFAULTS,
  SEARCH_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../search/core/featureFlags';
import { SEARCH_RANKING_WEIGHTS } from '../search/ranking/SearchRankingEngine';
import { createSearchSDK } from '../search/createSearchSDK';
import { createStubSearchAdapter } from '../search/adapters/StubSearchAdapter';
import {
  SEARCH_SDK_FROZEN,
  SEARCH_SDK_MODULE,
  SEARCH_SDK_VERSION,
} from '../search/version';
import {
  SEARCH_SDK_FROZEN as FROZEN_BARREL,
  SEARCH_SDK_MODULE as MODULE_BARREL,
  SEARCH_SDK_VERSION as VERSION_BARREL,
} from '../search/types/index';

describe('SearchSDK foundation (M4 PR-1)', () => {
  it('exports SEARCH_SDK_VERSION as 0.1.0-foundation', () => {
    assert.equal(SEARCH_SDK_VERSION, '0.1.0-foundation');
    assert.equal(VERSION_BARREL, '0.1.0-foundation');
  });

  it('exports SEARCH_SDK_FROZEN as false', () => {
    assert.equal(SEARCH_SDK_FROZEN, false);
    assert.equal(FROZEN_BARREL, false);
  });

  it('exports SEARCH_SDK_MODULE as search', () => {
    assert.equal(SEARCH_SDK_MODULE, 'search');
    assert.equal(MODULE_BARREL, 'search');
  });

  it('defaults all search feature flags to off', () => {
    assert.equal(SEARCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_SEARCH_ENABLED, false);
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_SEARCH_AUTOCOMPLETE_ENABLED,
      false
    );
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_SEARCH_SUGGESTIONS_ENABLED,
      false
    );
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_SEARCH_REPOSITORY_ENABLED,
      false
    );
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_SEARCH_ENABLED,
      'VITE_FF_SEARCH_ENABLED'
    );
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_SEARCH_AUTOCOMPLETE_ENABLED,
      'VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED'
    );
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_SEARCH_SUGGESTIONS_ENABLED,
      'VITE_FF_SEARCH_SUGGESTIONS_ENABLED'
    );
    assert.equal(
      SEARCH_SDK_FEATURE_FLAG_ENV_KEYS.FF_SEARCH_REPOSITORY_ENABLED,
      'VITE_FF_SEARCH_REPOSITORY_ENABLED'
    );
  });

  it('defines search ranking weights that sum to 1.0', () => {
    const sum =
      SEARCH_RANKING_WEIGHTS.exactMatch +
      SEARCH_RANKING_WEIGHTS.prefixMatch +
      SEARCH_RANKING_WEIGHTS.containsMatch +
      SEARCH_RANKING_WEIGHTS.popularity +
      SEARCH_RANKING_WEIGHTS.distance +
      SEARCH_RANKING_WEIGHTS.discoveryRank;
    assert.equal(sum, 1);
  });

  it('createSearchSDK returns stub adapter with NOT_CONFIGURED methods', async () => {
    const sdk = createSearchSDK();
    const result = await sdk.search({
      customerPoint: { lat: 18.52, lng: 73.85 },
      text: 'biryani',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('StubSearchAdapter suggest returns NOT_CONFIGURED', async () => {
    const sdk = createStubSearchAdapter();
    const result = await sdk.suggest({
      customerPoint: { lat: 18.52, lng: 73.85 },
      text: 'south',
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('StubSearchAdapter autocomplete returns NOT_CONFIGURED', async () => {
    const sdk = createStubSearchAdapter();
    const result = await sdk.autocomplete({ prefix: 'meg' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });
});
