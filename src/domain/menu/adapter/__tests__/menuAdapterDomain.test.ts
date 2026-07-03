import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideMenuReadSource, shouldFallbackOnMenuProjectionFailure } from '../MenuAdapterRules';
import { MENU_ADAPTER_FALLBACK_REASONS } from '../MenuAdapterMetadata';
import {
  createLegacyMenuDecision,
  createProjectionMenuDecision,
} from '../MenuAdapterDecision';

describe('Menu adapter domain (M7 PR-11)', () => {
  it('decideMenuReadSource returns legacy when flag off', () => {
    const decision = decideMenuReadSource({
      adapterFlagEnabled: false,
      projectionReady: true,
      operationalGreen: true,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, false);
  });

  it('decideMenuReadSource returns projection when all gates pass', () => {
    const decision = decideMenuReadSource({
      adapterFlagEnabled: true,
      projectionReady: true,
      operationalGreen: true,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'projection');
    assert.equal(decision.fallback, false);
  });

  it('decideMenuReadSource falls back when projection not ready', () => {
    const decision = decideMenuReadSource({
      adapterFlagEnabled: true,
      projectionReady: false,
      operationalGreen: true,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_NOT_READY);
  });

  it('decideMenuReadSource falls back when operational not green', () => {
    const decision = decideMenuReadSource({
      adapterFlagEnabled: true,
      projectionReady: true,
      operationalGreen: false,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, MENU_ADAPTER_FALLBACK_REASONS.OPERATIONAL_NOT_GREEN);
  });

  it('decideMenuReadSource falls back when projection repository unhealthy', () => {
    const decision = decideMenuReadSource({
      adapterFlagEnabled: true,
      projectionReady: true,
      operationalGreen: true,
      projectionRepositoryHealthy: false,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, MENU_ADAPTER_FALLBACK_REASONS.PROJECTION_UNHEALTHY);
  });

  it('createProjectionMenuDecision marks projection source', () => {
    const decision = createProjectionMenuDecision('test');
    assert.equal(decision.source, 'projection');
  });

  it('createLegacyMenuDecision supports fallback flag', () => {
    const decision = createLegacyMenuDecision('reason', true);
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
  });

  it('shouldFallbackOnMenuProjectionFailure returns true for projection source', () => {
    assert.equal(
      shouldFallbackOnMenuProjectionFailure(createProjectionMenuDecision('test')),
      true
    );
  });
});
