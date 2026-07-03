/**
 * Pricing projection health score (M8 PR-9).
 * Pure domain — no infrastructure imports.
 */

export type PricingProjectionHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface PricingProjectionHealthScore {
  readonly status: PricingProjectionHealthStatus;
  readonly score: number;
  readonly parityPercent: number;
  readonly reasons: readonly string[];
}

export function clampPricingPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function computePricingHealthScoreValue(parityPercent: number, penalties: number): number {
  const score = parityPercent - penalties;
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}
