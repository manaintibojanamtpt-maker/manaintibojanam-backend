/** Order adapter routing rules (M6 PR-11). Pure domain — no SDK imports. */

import { ORDER_ADAPTER_FALLBACK_REASONS } from './OrderAdapterMetadata';
import {
  createLegacyDecision,
  createProjectionDecision,
  type OrderAdapterDecision,
  type OrderAdapterReadinessContext,
} from './OrderAdapterDecision';

export function decideOrderReadSource(context: OrderAdapterReadinessContext): OrderAdapterDecision {
  if (!context.adapterFlagEnabled) {
    return createLegacyDecision(ORDER_ADAPTER_FALLBACK_REASONS.FLAG_DISABLED);
  }

  if (!context.parityReady) {
    return createLegacyDecision(ORDER_ADAPTER_FALLBACK_REASONS.PARITY_NOT_READY, true);
  }

  if (!context.operationalGreen) {
    return createLegacyDecision(ORDER_ADAPTER_FALLBACK_REASONS.OPERATIONAL_NOT_GREEN, true);
  }

  if (!context.projectionRepositoryAvailable) {
    return createLegacyDecision(ORDER_ADAPTER_FALLBACK_REASONS.PROJECTION_UNAVAILABLE, true);
  }

  return createProjectionDecision('Projection adapter gates satisfied');
}

export function shouldFallbackOnProjectionFailure(decision: OrderAdapterDecision): boolean {
  return decision.source === 'projection' || decision.fallback;
}
