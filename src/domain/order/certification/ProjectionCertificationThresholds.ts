/** Projection certification thresholds (M6 PR-13). Pure domain — no SDK imports. */

export interface ProjectionCertificationThresholds {
  readonly minStagingSoakHours: number;
  readonly minReplaySuccessPercent: number;
  readonly maxRollbackRatePercent: number;
  readonly maxProjectionLagMs: number;
  readonly minParityPercent: number;
  readonly conditionalMinParityPercent: number;
}

export const DEFAULT_PROJECTION_CERTIFICATION_THRESHOLDS: ProjectionCertificationThresholds = {
  minStagingSoakHours: 72,
  minReplaySuccessPercent: 99,
  maxRollbackRatePercent: 2,
  maxProjectionLagMs: 5000,
  minParityPercent: 99,
  conditionalMinParityPercent: 95,
};

export function mergeProjectionCertificationThresholds(
  overrides: Partial<ProjectionCertificationThresholds> = {}
): ProjectionCertificationThresholds {
  return { ...DEFAULT_PROJECTION_CERTIFICATION_THRESHOLDS, ...overrides };
}
