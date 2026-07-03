/**
 * Pricing projection rollout feature flags (M8 PR-12).
 */

export type PricingProjectionRolloutFeatureFlag = 'FF_PRICING_PROJECTION_ROLLOUT_ENABLED';

export const PRICING_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_PRICING_PROJECTION_ROLLOUT_ENABLED: false,
  },
} as const;

export const PRICING_PROJECTION_ROLLOUT_FEATURE_FLAG_ENV_KEYS: Record<
  PricingProjectionRolloutFeatureFlag,
  string
> = {
  FF_PRICING_PROJECTION_ROLLOUT_ENABLED: 'VITE_FF_PRICING_PROJECTION_ROLLOUT_ENABLED',
};

export type PricingProjectionRolloutFeatureFlagReader = (
  flag: PricingProjectionRolloutFeatureFlag
) => boolean;

export const readPricingProjectionRolloutFlagDefault = (
  flag: PricingProjectionRolloutFeatureFlag
): boolean => PRICING_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS.flags[flag];
