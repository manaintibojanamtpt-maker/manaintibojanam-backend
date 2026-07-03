/**
 * Projection certification feature flags (M6 PR-13).
 */

export type ProjectionCertificationFeatureFlag = 'FF_ORDER_PROJECTION_CERTIFICATION_ENABLED';

export const PROJECTION_CERTIFICATION_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_ORDER_PROJECTION_CERTIFICATION_ENABLED: false,
  },
} as const;

export const PROJECTION_CERTIFICATION_FEATURE_FLAG_ENV_KEYS: Record<
  ProjectionCertificationFeatureFlag,
  string
> = {
  FF_ORDER_PROJECTION_CERTIFICATION_ENABLED: 'VITE_FF_ORDER_PROJECTION_CERTIFICATION_ENABLED',
};

export type ProjectionCertificationFeatureFlagReader = (
  flag: ProjectionCertificationFeatureFlag
) => boolean;

export const readProjectionCertificationFlagDefault = (
  flag: ProjectionCertificationFeatureFlag
): boolean => PROJECTION_CERTIFICATION_FEATURE_FLAG_DEFAULTS.flags[flag];
