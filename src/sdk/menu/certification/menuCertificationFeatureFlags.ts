/**
 * Menu certification feature flags (M7 PR-13).
 */

export type MenuCertificationFeatureFlag = 'FF_MENU_PROJECTION_CERTIFICATION_ENABLED';

export const MENU_CERTIFICATION_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_MENU_PROJECTION_CERTIFICATION_ENABLED: false,
  },
} as const;

export const MENU_CERTIFICATION_FEATURE_FLAG_ENV_KEYS: Record<
  MenuCertificationFeatureFlag,
  string
> = {
  FF_MENU_PROJECTION_CERTIFICATION_ENABLED: 'VITE_FF_MENU_PROJECTION_CERTIFICATION_ENABLED',
};

export type MenuCertificationFeatureFlagReader = (
  flag: MenuCertificationFeatureFlag
) => boolean;

export const readMenuCertificationFlagDefault = (
  flag: MenuCertificationFeatureFlag
): boolean => MENU_CERTIFICATION_FEATURE_FLAG_DEFAULTS.flags[flag];
