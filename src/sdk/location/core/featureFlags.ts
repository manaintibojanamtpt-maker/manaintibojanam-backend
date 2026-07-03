/**
 * LocationSDK — M2 strangler feature flag contracts (ADR-011).
 * Implementations live outside the SDK; defaults are all off.
 */

export type LocationSdkFeatureFlag =
  | 'FF_LOCATION_MAP_ENABLED'
  | 'FF_LOCATION_DISCOVERY_ENABLED'
  | 'FF_LOCATION_OWNER_REGISTRATION_ENABLED'
  | 'FF_LOCATION_CUSTOMER_DETECTION_ENABLED';

export interface LocationFeatureFlagReader {
  isEnabled(flag: LocationSdkFeatureFlag): boolean;
}

export interface LocationFeatureFlagDefaults {
  readonly flags: Readonly<Record<LocationSdkFeatureFlag, boolean>>;
}

/** Default flag state: all off — zero behaviour change until PR-4+. */
export const LOCATION_SDK_FEATURE_FLAG_DEFAULTS: LocationFeatureFlagDefaults = {
  flags: {
    FF_LOCATION_MAP_ENABLED: false,
    FF_LOCATION_DISCOVERY_ENABLED: false,
    FF_LOCATION_OWNER_REGISTRATION_ENABLED: false,
    FF_LOCATION_CUSTOMER_DETECTION_ENABLED: false,
  },
};

export const LOCATION_SDK_FEATURE_FLAG_ENV_KEYS: Readonly<
  Record<LocationSdkFeatureFlag, string>
> = {
  FF_LOCATION_MAP_ENABLED: 'VITE_FF_LOCATION_MAP_ENABLED',
  FF_LOCATION_DISCOVERY_ENABLED: 'VITE_FF_LOCATION_DISCOVERY_ENABLED',
  FF_LOCATION_OWNER_REGISTRATION_ENABLED: 'VITE_FF_LOCATION_OWNER_REGISTRATION_ENABLED',
  FF_LOCATION_CUSTOMER_DETECTION_ENABLED: 'VITE_FF_LOCATION_CUSTOMER_DETECTION_ENABLED',
};
