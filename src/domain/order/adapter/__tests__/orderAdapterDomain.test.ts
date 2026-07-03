import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideOrderReadSource } from '../OrderAdapterRules';
import { ORDER_ADAPTER_FALLBACK_REASONS } from '../OrderAdapterMetadata';
import { createLegacyDecision, createProjectionDecision } from '../OrderAdapterDecision';

describe('Order adapter domain (M6 PR-11)', () => {
  it('decideOrderReadSource returns legacy when flag off', () => {
    const decision = decideOrderReadSource({
      adapterFlagEnabled: false,
      parityReady: true,
      operationalGreen: true,
      projectionRepositoryAvailable: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, false);
  });

  it('decideOrderReadSource returns projection when all gates pass', () => {
    const decision = decideOrderReadSource({
      adapterFlagEnabled: true,
      parityReady: true,
      operationalGreen: true,
      projectionRepositoryAvailable: true,
    });
    assert.equal(decision.source, 'projection');
    assert.equal(decision.fallback, false);
  });

  it('decideOrderReadSource falls back when parity not ready', () => {
    const decision = decideOrderReadSource({
      adapterFlagEnabled: true,
      parityReady: false,
      operationalGreen: true,
      projectionRepositoryAvailable: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, ORDER_ADAPTER_FALLBACK_REASONS.PARITY_NOT_READY);
  });

  it('decideOrderReadSource falls back when operational not green', () => {
    const decision = decideOrderReadSource({
      adapterFlagEnabled: true,
      parityReady: true,
      operationalGreen: false,
      projectionRepositoryAvailable: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
  });

  it('decideOrderReadSource falls back when projection unavailable', () => {
    const decision = decideOrderReadSource({
      adapterFlagEnabled: true,
      parityReady: true,
      operationalGreen: true,
      projectionRepositoryAvailable: false,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
  });

  it('createProjectionDecision marks projection source', () => {
    const decision = createProjectionDecision('test');
    assert.equal(decision.source, 'projection');
  });

  it('createLegacyDecision supports fallback flag', () => {
    const decision = createLegacyDecision('reason', true);
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
  });
});
