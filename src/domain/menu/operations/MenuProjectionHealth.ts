/** Menu projection operational health (M7 PR-10). Pure domain — no SDK imports. */

export type MenuProjectionHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface MenuProjectionHealth {
  readonly status: MenuProjectionHealthStatus;
  readonly score: number;
  readonly reasons: readonly string[];
}

export function computeMenuOperationalHealthScore(
  baseScore: number,
  penalties: readonly number[]
): number {
  const totalPenalty = penalties.reduce((sum, value) => sum + value, 0);
  return Math.max(0, Math.min(100, Math.round((baseScore - totalPenalty) * 100) / 100));
}
