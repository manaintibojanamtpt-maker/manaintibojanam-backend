/**
 * BhojanOS SDK — feature flag contracts (ADR-011 strangler rollout).
 * Implementations live outside the SDK; this module defines names and reader shape only.
 */

export type SdkFeatureFlag =
  | 'FF_SDK_ENABLED'
  | 'FF_SDK_ORDER_READ'
  | 'FF_SDK_ORDER_LIST'
  | 'FF_SDK_ORDER_WRITE';

export interface FeatureFlagReader {
  isEnabled(flag: SdkFeatureFlag): boolean;
}

export interface FeatureFlagDefaults {
  readonly flags: Readonly<Record<SdkFeatureFlag, boolean>>;
}

/** Default flag state: all off — zero behaviour change until PR-3+. */
export const SDK_FEATURE_FLAG_DEFAULTS: FeatureFlagDefaults = {
  flags: {
    FF_SDK_ENABLED: false,
    FF_SDK_ORDER_READ: false,
    FF_SDK_ORDER_LIST: false,
    FF_SDK_ORDER_WRITE: false,
  },
};
