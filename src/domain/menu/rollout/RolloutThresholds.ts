/** Menu rollout thresholds (M7 PR-12). Pure domain — no SDK imports. */

export interface RolloutThresholds {
  readonly minParityPercent: number;
  readonly maxFallbackRatePercent: number;
  readonly maxP95LatencyMs: number;
  readonly minTelemetryHealthScore: number;
}

export const DEFAULT_ROLLOUT_THRESHOLDS: RolloutThresholds = {
  minParityPercent: 99,
  maxFallbackRatePercent: 2,
  maxP95LatencyMs: 500,
  minTelemetryHealthScore: 90,
};

export function mergeRolloutThresholds(
  overrides: Partial<RolloutThresholds> = {}
): RolloutThresholds {
  return { ...DEFAULT_ROLLOUT_THRESHOLDS, ...overrides };
}
