/**
 * Pricing projection soak thresholds (M8 PR-9).
 * Pure domain — no infrastructure imports.
 */

export interface PricingProjectionSoakThresholds {
  readonly greenMinParityPercent: number;
  readonly amberMinParityPercent: number;
  readonly readyMinParityPercent: number;
  readonly readyMinFieldParityPercent: number;
  readonly conditionalMinParityPercent: number;
  readonly maxMissingPercent: number;
  readonly maxFieldMismatchPercent: number;
  readonly maxVersionMismatchPercent: number;
  readonly maxP95LatencyMs: number;
  readonly minSampleSize: number;
}

export const DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS: PricingProjectionSoakThresholds = {
  greenMinParityPercent: 99,
  amberMinParityPercent: 95,
  readyMinParityPercent: 99,
  readyMinFieldParityPercent: 99,
  conditionalMinParityPercent: 97,
  maxMissingPercent: 1,
  maxFieldMismatchPercent: 2,
  maxVersionMismatchPercent: 0.5,
  maxP95LatencyMs: 500,
  minSampleSize: 10,
};

export const CRITICAL_PRICING_PARITY_OUTCOMES = [
  'VERSION_MISMATCH',
  'MISSING_IN_PROJECTION',
] as const;

export function mergePricingProjectionSoakThresholds(
  overrides: Partial<PricingProjectionSoakThresholds> = {}
): PricingProjectionSoakThresholds {
  return { ...DEFAULT_PRICING_PROJECTION_SOAK_THRESHOLDS, ...overrides };
}
