/**
 * M2 PR-2+ — presentation feature flags for LocationSDK strangler rollout.
 * All flags default OFF — zero behaviour change until PR-4+.
 */

import { EnvironmentConfig } from '../config/environment';
import {
  LOCATION_SDK_FEATURE_FLAG_DEFAULTS,
  LOCATION_SDK_FEATURE_FLAG_ENV_KEYS,
  type LocationSdkFeatureFlag,
} from '../sdk/location/core/featureFlags';

export type { LocationSdkFeatureFlag };

const readLocationFlag = (flag: LocationSdkFeatureFlag): boolean => {
  const envKey = LOCATION_SDK_FEATURE_FLAG_ENV_KEYS[flag];
  const envValue = import.meta.env[envKey];
  if (envValue === 'true') {
    return true;
  }
  if (envValue === 'false') {
    return false;
  }

  if (EnvironmentConfig.isDevelopment() || EnvironmentConfig.isPreview()) {
    try {
      const localOverride = localStorage.getItem(flag);
      if (localOverride === 'true') {
        return true;
      }
      if (localOverride === 'false') {
        return false;
      }
    } catch {
      // ignore localStorage errors
    }
  }

  return LOCATION_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
};

export const isLocationMapEnabled = (): boolean =>
  readLocationFlag('FF_LOCATION_MAP_ENABLED');

export const isLocationDiscoveryEnabled = (): boolean =>
  readLocationFlag('FF_LOCATION_DISCOVERY_ENABLED');

export const isLocationOwnerRegistrationEnabled = (): boolean =>
  readLocationFlag('FF_LOCATION_OWNER_REGISTRATION_ENABLED');

export const isLocationCustomerDetectionEnabled = (): boolean =>
  readLocationFlag('FF_LOCATION_CUSTOMER_DETECTION_ENABLED');

export const setLocationFlagOverride = (
  flag: LocationSdkFeatureFlag,
  enabled: boolean
): void => {
  if (!EnvironmentConfig.isDevelopment() && !EnvironmentConfig.isPreview()) {
    console.warn(`${flag} overrides are not permitted in production.`);
    return;
  }
  try {
    localStorage.setItem(flag, String(enabled));
  } catch {
    // ignore
  }
};
