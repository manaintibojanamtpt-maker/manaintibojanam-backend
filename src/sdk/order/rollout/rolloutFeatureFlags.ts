/**
 * Projection rollout feature flags (M6 PR-12).
 */

export type ProjectionRolloutFeatureFlag = 'FF_ORDER_PROJECTION_ROLLOUT_ENABLED';

export const PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_ORDER_PROJECTION_ROLLOUT_ENABLED: false,
  },
} as const;

export const PROJECTION_ROLLOUT_FEATURE_FLAG_ENV_KEYS: Record<
  ProjectionRolloutFeatureFlag,
  string
> = {
  FF_ORDER_PROJECTION_ROLLOUT_ENABLED: 'VITE_FF_ORDER_PROJECTION_ROLLOUT_ENABLED',
};

export type ProjectionRolloutFeatureFlagReader = (
  flag: ProjectionRolloutFeatureFlag
) => boolean;

export const readProjectionRolloutFlagDefault = (
  flag: ProjectionRolloutFeatureFlag
): boolean => PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS.flags[flag];
