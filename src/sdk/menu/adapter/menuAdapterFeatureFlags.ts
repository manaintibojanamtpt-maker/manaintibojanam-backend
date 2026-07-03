/**
 * Menu adapter feature flags (M7 PR-11).
 * Additive — does not modify MenuSDK public API or frozen feature flags.
 */

export type MenuAdapterFeatureFlag = 'FF_MENU_PROJECTION_ADAPTER_ENABLED';

export const MENU_ADAPTER_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_MENU_PROJECTION_ADAPTER_ENABLED: false,
  },
} as const;

export const MENU_ADAPTER_FEATURE_FLAG_ENV_KEYS: Record<MenuAdapterFeatureFlag, string> = {
  FF_MENU_PROJECTION_ADAPTER_ENABLED: 'VITE_FF_MENU_PROJECTION_ADAPTER_ENABLED',
};

export type MenuAdapterFeatureFlagReader = (flag: MenuAdapterFeatureFlag) => boolean;

export const readMenuAdapterFlagDefault = (flag: MenuAdapterFeatureFlag): boolean =>
  MENU_ADAPTER_FEATURE_FLAG_DEFAULTS.flags[flag];
