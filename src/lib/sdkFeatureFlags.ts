/**
 * M1 PR-4+ — presentation feature flags for SDK strangler rollout.
 */

import { EnvironmentConfig } from '../config/environment';

export type SdkPresentationFeatureFlag =
  | 'FF_SDK_ORDERTRACKING_ENABLED'
  | 'FF_SDK_MYORDERS_ENABLED'
  | 'FF_SDK_OWNER_ORDERS_ENABLED';

const FLAG_ENV_KEYS: Record<SdkPresentationFeatureFlag, string> = {
  FF_SDK_ORDERTRACKING_ENABLED: 'VITE_FF_SDK_ORDERTRACKING_ENABLED',
  FF_SDK_MYORDERS_ENABLED: 'VITE_FF_SDK_MYORDERS_ENABLED',
  FF_SDK_OWNER_ORDERS_ENABLED: 'VITE_FF_SDK_OWNER_ORDERS_ENABLED',
};

const readSdkPresentationFlag = (flag: SdkPresentationFeatureFlag): boolean => {
  const envKey = FLAG_ENV_KEYS[flag];
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

  return false;
};

export const isSdkOrderTrackingEnabled = (): boolean =>
  readSdkPresentationFlag('FF_SDK_ORDERTRACKING_ENABLED');

export const isSdkMyOrdersEnabled = (): boolean =>
  readSdkPresentationFlag('FF_SDK_MYORDERS_ENABLED');

export const isSdkOwnerOrdersEnabled = (): boolean =>
  readSdkPresentationFlag('FF_SDK_OWNER_ORDERS_ENABLED');

export const setSdkPresentationOverride = (
  flag: SdkPresentationFeatureFlag,
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

export const setSdkOrderTrackingOverride = (enabled: boolean): void => {
  setSdkPresentationOverride('FF_SDK_ORDERTRACKING_ENABLED', enabled);
};

export const setSdkMyOrdersOverride = (enabled: boolean): void => {
  setSdkPresentationOverride('FF_SDK_MYORDERS_ENABLED', enabled);
};

export const setSdkOwnerOrdersOverride = (enabled: boolean): void => {
  setSdkPresentationOverride('FF_SDK_OWNER_ORDERS_ENABLED', enabled);
};
