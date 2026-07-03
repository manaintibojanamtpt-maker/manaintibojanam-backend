/**
 * Menu projection rollout feature flags (M7 PR-12).
 */

export type MenuProjectionRolloutFeatureFlag = 'FF_MENU_PROJECTION_ROLLOUT_ENABLED';

export const MENU_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_MENU_PROJECTION_ROLLOUT_ENABLED: false,
  },
} as const;

export const MENU_PROJECTION_ROLLOUT_FEATURE_FLAG_ENV_KEYS: Record<
  MenuProjectionRolloutFeatureFlag,
  string
> = {
  FF_MENU_PROJECTION_ROLLOUT_ENABLED: 'VITE_FF_MENU_PROJECTION_ROLLOUT_ENABLED',
};

export type MenuProjectionRolloutFeatureFlagReader = (
  flag: MenuProjectionRolloutFeatureFlag
) => boolean;

export const readMenuProjectionRolloutFlagDefault = (
  flag: MenuProjectionRolloutFeatureFlag
): boolean => MENU_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS.flags[flag];
