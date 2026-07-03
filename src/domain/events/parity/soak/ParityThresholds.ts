/** Parity soak thresholds (M6 PR-9). Pure domain — no SDK imports. */

export interface ParitySoakThresholds {
  readonly greenMinParityPercent: number;
  readonly amberMinParityPercent: number;
  readonly readyMinParityPercent: number;
  readonly conditionalMinParityPercent: number;
  readonly maxMissingProjectionPercent: number;
  readonly maxMissingLegacyPercent: number;
  readonly maxFieldMismatchPercent: number;
  readonly maxVersionMismatchPercent: number;
  readonly maxP95LatencyMs: number;
  readonly minSampleSize: number;
}

export const DEFAULT_PARITY_SOAK_THRESHOLDS: ParitySoakThresholds = {
  greenMinParityPercent: 99,
  amberMinParityPercent: 95,
  readyMinParityPercent: 99.5,
  conditionalMinParityPercent: 97,
  maxMissingProjectionPercent: 1,
  maxMissingLegacyPercent: 0.5,
  maxFieldMismatchPercent: 2,
  maxVersionMismatchPercent: 0.5,
  maxP95LatencyMs: 500,
  minSampleSize: 10,
};

export function mergeParitySoakThresholds(
  overrides: Partial<ParitySoakThresholds> = {}
): ParitySoakThresholds {
  return { ...DEFAULT_PARITY_SOAK_THRESHOLDS, ...overrides };
}
