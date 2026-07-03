/**
 * Menu projection health score (M7 PR-9).
 * Pure domain — no infrastructure imports.
 */

export type MenuProjectionHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface MenuProjectionHealthScore {
  readonly status: MenuProjectionHealthStatus;
  readonly score: number;
  readonly parityPercent: number;
  readonly reasons: readonly string[];
}

export function clampMenuPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function computeMenuHealthScoreValue(parityPercent: number, penalties: number): number {
  const score = parityPercent - penalties;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}
