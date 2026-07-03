/** Pricing certification thresholds (M8 PR-13). Pure domain — no SDK imports. */

export interface PricingCertificationThresholds {
  readonly minStagingSoakHours: number;
  readonly minReplaySuccessPercent: number;
  readonly maxRollbackRatePercent: number;
  readonly maxProjectionLagMs: number;
  readonly minParityPercent: number;
  readonly conditionalMinParityPercent: number;
  readonly maxFallbackRatePercent: number;
}

export const DEFAULT_PRICING_CERTIFICATION_THRESHOLDS: PricingCertificationThresholds = {
  minStagingSoakHours: 72,
  minReplaySuccessPercent: 99,
  maxRollbackRatePercent: 2,
  maxProjectionLagMs: 30_000,
  minParityPercent: 99,
  conditionalMinParityPercent: 95,
  maxFallbackRatePercent: 2,
};

export function mergePricingCertificationThresholds(
  overrides: Partial<PricingCertificationThresholds> = {}
): PricingCertificationThresholds {
  return { ...DEFAULT_PRICING_CERTIFICATION_THRESHOLDS, ...overrides };
}
