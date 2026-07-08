import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { isContractMenuPathEnabled } from '../src/features/food/hooks/useContractV1Feature';

describe('Sprint 19 — Firestore sync flags', () => {
  it('defaults FF_OB_FIRESTORE to OFF', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_FIRESTORE'), false);
  });

  it('contract menu path helper respects default flags', () => {
    assert.equal(isContractMenuPathEnabled(), false);
  });
});
