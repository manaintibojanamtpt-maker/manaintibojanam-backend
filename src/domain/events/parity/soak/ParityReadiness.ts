/** Parity readiness certification (M6 PR-9). Pure domain — no SDK imports. */

import type { ProjectionHealthStatus } from './ParityHealthScore';

export type ParityCertificationStatus = 'READY' | 'CONDITIONAL' | 'NOT_READY';

export interface ParityReadiness {
  readonly certification: ParityCertificationStatus;
  readonly health: ProjectionHealthStatus;
  readonly recommendation: string;
  readonly blockers: readonly string[];
  readonly generatedAt: string;
}

export function buildReadinessRecommendation(
  certification: ParityCertificationStatus,
  health: ProjectionHealthStatus
): string {
  if (certification === 'READY') {
    return 'Projection parity soak passed. Await ARB approval before adapter switch.';
  }
  if (certification === 'CONDITIONAL') {
    return `Projection health is ${health}. Resolve outstanding parity gaps before adapter switch.`;
  }
  return 'Projection is not ready for adapter switch. Continue soak and remediate mismatches.';
}
