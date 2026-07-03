/**
 * Pricing certification feature flags (M8 PR-13).
 */

export type PricingCertificationFeatureFlag = 'FF_PRICING_PROJECTION_CERTIFICATION_ENABLED';

export const PRICING_CERTIFICATION_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_PRICING_PROJECTION_CERTIFICATION_ENABLED: false,
  },
} as const;

export const PRICING_CERTIFICATION_FEATURE_FLAG_ENV_KEYS: Record<
  PricingCertificationFeatureFlag,
  string
> = {
  FF_PRICING_PROJECTION_CERTIFICATION_ENABLED: 'VITE_FF_PRICING_PROJECTION_CERTIFICATION_ENABLED',
};

export type PricingCertificationFeatureFlagReader = (
  flag: PricingCertificationFeatureFlag
) => boolean;

export const readPricingCertificationFlagDefault = (
  flag: PricingCertificationFeatureFlag
): boolean => PRICING_CERTIFICATION_FEATURE_FLAG_DEFAULTS.flags[flag];
