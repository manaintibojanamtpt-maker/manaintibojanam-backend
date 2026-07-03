/** Menu projection lag types (M7 PR-10). Pure domain — no SDK imports. */

export interface MenuProjectionLagSample {
  readonly projectionName: string;
  readonly lastEventProcessedAt: string;
  readonly evaluatedAt: string;
  readonly checkpointUpdatedAt?: string;
}

export interface MenuProjectionLagMetrics {
  readonly projectionName: string;
  readonly currentLagMs: number;
  readonly maximumLagMs: number;
  readonly checkpointAgeMs: number;
  readonly detectedAt: string;
}

export function computeMenuLagMs(lastEventProcessedAt: string, evaluatedAt: string): number {
  const lag = Date.parse(evaluatedAt) - Date.parse(lastEventProcessedAt);
  return Number.isFinite(lag) && lag > 0 ? lag : 0;
}

export function computeMenuCheckpointAgeMs(
  checkpointUpdatedAt: string | undefined,
  evaluatedAt: string
): number {
  if (!checkpointUpdatedAt) return 0;
  const age = Date.parse(evaluatedAt) - Date.parse(checkpointUpdatedAt);
  return Number.isFinite(age) && age > 0 ? age : 0;
}

export function buildMenuProjectionLagMetrics(
  sample: MenuProjectionLagSample,
  historicalMaximumLagMs = 0
): MenuProjectionLagMetrics {
  const currentLagMs = computeMenuLagMs(sample.lastEventProcessedAt, sample.evaluatedAt);
  const checkpointAgeMs = computeMenuCheckpointAgeMs(sample.checkpointUpdatedAt, sample.evaluatedAt);
  return {
    projectionName: sample.projectionName,
    currentLagMs,
    maximumLagMs: Math.max(historicalMaximumLagMs, currentLagMs),
    checkpointAgeMs,
    detectedAt: sample.evaluatedAt,
  };
}
