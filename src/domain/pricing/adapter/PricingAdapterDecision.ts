/** Pricing adapter decision (M8 PR-11). Pure domain — no SDK imports. */

import type { PricingReadSource } from './PricingReadSource';

export interface PricingAdapterDecision {
  readonly source: PricingReadSource;
  readonly reason: string;
  readonly fallback: boolean;
}

export interface PricingAdapterReadinessContext {
  readonly adapterFlagEnabled: boolean;
  readonly projectionReady: boolean;
  readonly operationalGreen: boolean;
  readonly projectionRepositoryHealthy: boolean;
}

export function createLegacyPricingDecision(
  reason: string,
  fallback = false
): PricingAdapterDecision {
  return { source: 'legacy', reason, fallback };
}

export function createProjectionPricingDecision(reason: string): PricingAdapterDecision {
  return { source: 'projection', reason, fallback: false };
}
