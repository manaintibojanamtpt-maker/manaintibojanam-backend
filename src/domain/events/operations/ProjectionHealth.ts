/** Projection operational health (M6 PR-10). Pure domain — no SDK imports. */

export type ProjectionOperationalHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface ProjectionOperationalHealth {
  readonly status: ProjectionOperationalHealthStatus;
  readonly score: number;
  readonly reasons: readonly string[];
}

export function computeOperationalHealthScore(
  baseScore: number,
  penalties: readonly number[]
): number {
  const totalPenalty = penalties.reduce((sum, value) => sum + value, 0);
  return Math.max(0, Math.min(100, Math.round((baseScore - totalPenalty) * 100) / 100));
}
