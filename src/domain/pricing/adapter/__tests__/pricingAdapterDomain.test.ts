import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  decidePricingReadSource,
  shouldFallbackOnPricingProjectionFailure,
} from '../PricingAdapterRules';
import { PRICING_ADAPTER_FALLBACK_REASONS } from '../PricingAdapterMetadata';
import {
  createLegacyPricingDecision,
  createProjectionPricingDecision,
} from '../PricingAdapterDecision';

describe('Pricing adapter domain (M8 PR-11)', () => {
  it('decidePricingReadSource returns legacy when flag off', () => {
    const decision = decidePricingReadSource({
      adapterFlagEnabled: false,
      projectionReady: true,
      operationalGreen: true,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, false);
  });

  it('decidePricingReadSource returns projection when all gates pass', () => {
    const decision = decidePricingReadSource({
      adapterFlagEnabled: true,
      projectionReady: true,
      operationalGreen: true,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'projection');
    assert.equal(decision.fallback, false);
  });

  it('decidePricingReadSource falls back when projection not ready', () => {
    const decision = decidePricingReadSource({
      adapterFlagEnabled: true,
      projectionReady: false,
      operationalGreen: true,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_NOT_READY);
  });

  it('decidePricingReadSource falls back when operational not green', () => {
    const decision = decidePricingReadSource({
      adapterFlagEnabled: true,
      projectionReady: true,
      operationalGreen: false,
      projectionRepositoryHealthy: true,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, PRICING_ADAPTER_FALLBACK_REASONS.OPERATIONAL_NOT_GREEN);
  });

  it('decidePricingReadSource falls back when projection repository unhealthy', () => {
    const decision = decidePricingReadSource({
      adapterFlagEnabled: true,
      projectionReady: true,
      operationalGreen: true,
      projectionRepositoryHealthy: false,
    });
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
    assert.equal(decision.reason, PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_UNHEALTHY);
  });

  it('createProjectionPricingDecision marks projection source', () => {
    const decision = createProjectionPricingDecision('test');
    assert.equal(decision.source, 'projection');
  });

  it('createLegacyPricingDecision supports fallback flag', () => {
    const decision = createLegacyPricingDecision('reason', true);
    assert.equal(decision.source, 'legacy');
    assert.equal(decision.fallback, true);
  });

  it('shouldFallbackOnPricingProjectionFailure returns true for projection source', () => {
    assert.equal(
      shouldFallbackOnPricingProjectionFailure(createProjectionPricingDecision('test')),
      true
    );
  });
});
