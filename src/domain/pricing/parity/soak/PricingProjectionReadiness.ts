/**
 * Pricing projection readiness certification (M8 PR-9).
 * Pure domain — no infrastructure imports.
 */

import type { PricingProjectionHealthStatus } from './PricingProjectionHealthScore';

export type PricingProjectionCertificationStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export interface PricingProjectionReadiness {
  readonly certification: PricingProjectionCertificationStatus;
  readonly health: PricingProjectionHealthStatus;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly generatedAt: string;
}

export function buildPricingReadinessRecommendation(
  certification: PricingProjectionCertificationStatus,
  health: PricingProjectionHealthStatus
): string {
  if (certification === 'READY') {
    return 'Pricing projection parity soak passed. Await ARB approval before operational validation.';
  }
  if (certification === 'CONDITIONAL') {
    return `Pricing projection health is ${health}. Resolve outstanding parity gaps before adapter switch.`;
  }
  return 'Pricing projection is not ready. Continue soak and remediate mismatches.';
}
