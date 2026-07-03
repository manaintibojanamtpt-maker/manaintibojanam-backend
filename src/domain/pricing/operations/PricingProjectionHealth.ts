/** Pricing projection operational health (M8 PR-10). Pure domain — no SDK imports. */

export type PricingProjectionHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface PricingProjectionHealth {
  readonly status: PricingProjectionHealthStatus;
  readonly score: number;
  readonly reasons: readonly string[];
}

export function computePricingOperationalHealthScore(
  baseScore: number,
  penalties: readonly number[]
): number {
  const totalPenalty = penalties.reduce((sum, value) => sum + value, 0);
  return Math.max(0, Math.min(100, Math.round((baseScore - totalPenalty) * 100) / 100));
}
