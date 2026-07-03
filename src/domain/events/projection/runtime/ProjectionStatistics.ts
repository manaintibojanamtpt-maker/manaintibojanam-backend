/** Projection runtime statistics (M6 PR-6). Pure domain — no SDK imports. */

export interface ProjectionRuntimeStatistics {
  readonly projectionName: string;
  readonly consumerGroup: string;
  readonly processed: number;
  readonly failed: number;
  readonly replayed: number;
  readonly skipped: number;
  readonly checkpointCount: number;
  readonly averageDurationMs: number;
  readonly executionCount: number;
}

export function createEmptyStatistics(
  projectionName: string,
  consumerGroup: string
): ProjectionRuntimeStatistics {
  return {
    projectionName,
    consumerGroup,
    processed: 0,
    failed: 0,
    replayed: 0,
    skipped: 0,
    checkpointCount: 0,
    averageDurationMs: 0,
    executionCount: 0,
  };
}

export function updateStatistics(
  current: ProjectionRuntimeStatistics,
  delta: {
    processed?: number;
    failed?: number;
    replayed?: number;
    skipped?: number;
    checkpointSaved?: boolean;
    durationMs?: number;
  }
): ProjectionRuntimeStatistics {
  const processed = current.processed + (delta.processed ?? 0);
  const failed = current.failed + (delta.failed ?? 0);
  const replayed = current.replayed + (delta.replayed ?? 0);
  const skipped = current.skipped + (delta.skipped ?? 0);
  const checkpointCount = current.checkpointCount + (delta.checkpointSaved ? 1 : 0);
  const executionCount = current.executionCount + (delta.durationMs !== undefined ? 1 : 0);

  let averageDurationMs = current.averageDurationMs;
  if (delta.durationMs !== undefined && executionCount > 0) {
    const totalDuration =
      current.averageDurationMs * current.executionCount + delta.durationMs;
    averageDurationMs = Math.round(totalDuration / executionCount);
  }

  return {
    projectionName: current.projectionName,
    consumerGroup: current.consumerGroup,
    processed,
    failed,
    replayed,
    skipped,
    checkpointCount,
    averageDurationMs,
    executionCount,
  };
}
