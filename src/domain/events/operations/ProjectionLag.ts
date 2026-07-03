/** Projection lag types (M6 PR-10). Pure domain — no SDK imports. */

export interface ProjectionLagSample {
  readonly projectionName: string;
  readonly lastEventProcessedAt: string;
  readonly evaluatedAt: string;
  readonly checkpointUpdatedAt?: string;
}

export interface ProjectionLagMetrics {
  readonly projectionName: string;
  readonly currentLagMs: number;
  readonly maximumLagMs: number;
  readonly checkpointAgeMs: number;
  readonly detectedAt: string;
}

export function computeLagMs(lastEventProcessedAt: string, evaluatedAt: string): number {
  const lag = Date.parse(evaluatedAt) - Date.parse(lastEventProcessedAt);
  return Number.isFinite(lag) && lag > 0 ? lag : 0;
}

export function computeCheckpointAgeMs(
  checkpointUpdatedAt: string | undefined,
  evaluatedAt: string
): number {
  if (!checkpointUpdatedAt) return 0;
  const age = Date.parse(evaluatedAt) - Date.parse(checkpointUpdatedAt);
  return Number.isFinite(age) && age > 0 ? age : 0;
}

export function buildProjectionLagMetrics(
  sample: ProjectionLagSample,
  historicalMaximumLagMs = 0
): ProjectionLagMetrics {
  const currentLagMs = computeLagMs(sample.lastEventProcessedAt, sample.evaluatedAt);
  const checkpointAgeMs = computeCheckpointAgeMs(sample.checkpointUpdatedAt, sample.evaluatedAt);
  return {
    projectionName: sample.projectionName,
    currentLagMs,
    maximumLagMs: Math.max(historicalMaximumLagMs, currentLagMs),
    checkpointAgeMs,
    detectedAt: sample.evaluatedAt,
  };
}
