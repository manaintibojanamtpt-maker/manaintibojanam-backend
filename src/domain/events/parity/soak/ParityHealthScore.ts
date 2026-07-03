/** Parity health score (M6 PR-9). Pure domain — no SDK imports. */

export type ProjectionHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface ParityHealthScore {
  readonly status: ProjectionHealthStatus;
  readonly score: number;
  readonly parityPercent: number;
  readonly reasons: readonly string[];
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function computeHealthScoreValue(parityPercent: number, penalties: number): number {
  const score = parityPercent - penalties;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}
