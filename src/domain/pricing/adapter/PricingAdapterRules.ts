/** Pricing adapter routing rules (M8 PR-11). Pure domain — no SDK imports. */

import { PRICING_ADAPTER_FALLBACK_REASONS } from './PricingAdapterMetadata';
import {
  createLegacyPricingDecision,
  createProjectionPricingDecision,
  type PricingAdapterDecision,
  type PricingAdapterReadinessContext,
} from './PricingAdapterDecision';

export function decidePricingReadSource(
  context: PricingAdapterReadinessContext
): PricingAdapterDecision {
  if (!context.adapterFlagEnabled) {
    return createLegacyPricingDecision(PRICING_ADAPTER_FALLBACK_REASONS.FLAG_DISABLED);
  }

  if (!context.projectionReady) {
    return createLegacyPricingDecision(PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_NOT_READY, true);
  }

  if (!context.operationalGreen) {
    return createLegacyPricingDecision(PRICING_ADAPTER_FALLBACK_REASONS.OPERATIONAL_NOT_GREEN, true);
  }

  if (!context.projectionRepositoryHealthy) {
    return createLegacyPricingDecision(PRICING_ADAPTER_FALLBACK_REASONS.PROJECTION_UNHEALTHY, true);
  }

  return createProjectionPricingDecision('Pricing projection adapter gates satisfied');
}

export function shouldFallbackOnPricingProjectionFailure(
  decision: PricingAdapterDecision
): boolean {
  return decision.source === 'projection' || decision.fallback;
}
