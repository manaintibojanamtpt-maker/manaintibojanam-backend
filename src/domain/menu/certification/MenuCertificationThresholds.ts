/** Menu certification thresholds (M7 PR-13). Pure domain — no SDK imports. */

export interface MenuCertificationThresholds {
  readonly minStagingSoakHours: number;
  readonly minReplaySuccessPercent: number;
  readonly maxRollbackRatePercent: number;
  readonly maxProjectionLagMs: number;
  readonly minParityPercent: number;
  readonly conditionalMinParityPercent: number;
  readonly maxFallbackRatePercent: number;
}

export const DEFAULT_MENU_CERTIFICATION_THRESHOLDS: MenuCertificationThresholds = {
  minStagingSoakHours: 72,
  minReplaySuccessPercent: 99,
  maxRollbackRatePercent: 2,
  maxProjectionLagMs: 30_000,
  minParityPercent: 99,
  conditionalMinParityPercent: 95,
  maxFallbackRatePercent: 2,
};

export function mergeMenuCertificationThresholds(
  overrides: Partial<MenuCertificationThresholds> = {}
): MenuCertificationThresholds {
  return { ...DEFAULT_MENU_CERTIFICATION_THRESHOLDS, ...overrides };
}
