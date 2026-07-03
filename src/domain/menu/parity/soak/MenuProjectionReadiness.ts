/**
 * Menu projection readiness certification (M7 PR-9).
 * Pure domain — no infrastructure imports.
 */

import type { MenuProjectionHealthStatus } from './MenuProjectionHealthScore';

export type MenuProjectionCertificationStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export interface MenuProjectionReadiness {
  readonly certification: MenuProjectionCertificationStatus;
  readonly health: MenuProjectionHealthStatus;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly generatedAt: string;
}

export function buildMenuReadinessRecommendation(
  certification: MenuProjectionCertificationStatus,
  health: MenuProjectionHealthStatus
): string {
  if (certification === 'READY') {
    return 'Menu projection parity soak passed. Await ARB approval before operational validation.';
  }
  if (certification === 'CONDITIONAL') {
    return `Menu projection health is ${health}. Resolve outstanding parity gaps before adapter switch.`;
  }
  return 'Menu projection is not ready. Continue soak and remediate mismatches.';
}
