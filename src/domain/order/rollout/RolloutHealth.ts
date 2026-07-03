/** Rollout health signals (M6 PR-12). Pure domain — no SDK imports. */

export type RolloutOperationalHealth = 'GREEN' | 'AMBER' | 'RED';

export interface RolloutHealthSnapshot {
  readonly parityReady: boolean;
  readonly parityPercent: number;
  readonly operationalHealth: RolloutOperationalHealth;
  readonly projectionRepositoryHealthy: boolean;
  readonly fallbackRatePercent: number;
  readonly p95LatencyMs: number;
  readonly telemetryHealthScore: number;
}

export function isRolloutHealthGreen(snapshot: RolloutHealthSnapshot): boolean {
  return snapshot.operationalHealth === 'GREEN';
}
