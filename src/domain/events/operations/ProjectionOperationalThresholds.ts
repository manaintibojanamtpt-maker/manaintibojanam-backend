/** Projection operational thresholds (M6 PR-10). Pure domain — no SDK imports. */

export interface ProjectionOperationalThresholds {
  readonly maxAverageLatencyMs: number;
  readonly maxP95LatencyMs: number;
  readonly maxP99LatencyMs: number;
  readonly maxLagMs: number;
  readonly minReplaySuccessPercent: number;
  readonly maxDuplicatePercent: number;
  readonly maxDroppedEventPercent: number;
  readonly maxCheckpointAgeMs: number;
  readonly minWorkerUptimePercent: number;
  readonly minThroughputPerMinute: number;
  readonly minSampleSize: number;
}

export const DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS: ProjectionOperationalThresholds = {
  maxAverageLatencyMs: 200,
  maxP95LatencyMs: 500,
  maxP99LatencyMs: 1000,
  maxLagMs: 30_000,
  minReplaySuccessPercent: 99,
  maxDuplicatePercent: 0.5,
  maxDroppedEventPercent: 0.1,
  maxCheckpointAgeMs: 60_000,
  minWorkerUptimePercent: 99.5,
  minThroughputPerMinute: 10,
  minSampleSize: 10,
};

export function mergeProjectionOperationalThresholds(
  overrides: Partial<ProjectionOperationalThresholds> = {}
): ProjectionOperationalThresholds {
  return { ...DEFAULT_PROJECTION_OPERATIONAL_THRESHOLDS, ...overrides };
}
