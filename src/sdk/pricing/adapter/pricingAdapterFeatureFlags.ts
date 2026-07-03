/**
 * Pricing adapter feature flags (M8 PR-11).
 * Additive — does not modify PricingSDK public API or frozen feature flags.
 */

export type PricingAdapterFeatureFlag = 'FF_PRICING_PROJECTION_ADAPTER_ENABLED';

export const PRICING_ADAPTER_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_PRICING_PROJECTION_ADAPTER_ENABLED: false,
  },
} as const;

export const PRICING_ADAPTER_FEATURE_FLAG_ENV_KEYS: Record<PricingAdapterFeatureFlag, string> = {
  FF_PRICING_PROJECTION_ADAPTER_ENABLED: 'VITE_FF_PRICING_PROJECTION_ADAPTER_ENABLED',
};

export type PricingAdapterFeatureFlagReader = (flag: PricingAdapterFeatureFlag) => boolean;

export const readPricingAdapterFlagDefault = (flag: PricingAdapterFeatureFlag): boolean =>
  PRICING_ADAPTER_FEATURE_FLAG_DEFAULTS.flags[flag];
