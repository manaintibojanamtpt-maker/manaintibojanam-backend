/**
 * M5 PR-5 — presentation feature flags for BranchSDK rollout.
 */

import {
  BRANCH_SDK_FEATURE_FLAG_DEFAULTS,
  BRANCH_SDK_FEATURE_FLAG_ENV_KEYS,
  type BranchSdkFeatureFlag,
} from '../../sdk/branch/core/featureFlags';

export type { BranchSdkFeatureFlag };

const readBranchFlag = (flag: BranchSdkFeatureFlag): boolean => {
  const envKey = BRANCH_SDK_FEATURE_FLAG_ENV_KEYS[flag];
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[envKey] : undefined;
  if (envValue === 'true') {
    return true;
  }
  if (envValue === 'false') {
    return false;
  }

  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const isDev =
      import.meta.env.DEV === true || import.meta.env.VITE_APP_ENV === 'development';
    const isPreview = import.meta.env.VITE_APP_ENV === 'preview';
    if (isDev || isPreview) {
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
  }

  return BRANCH_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
};

export const isBranchEnabled = (): boolean => readBranchFlag('FF_BRANCH_ENABLED');

export const readBranchFeatureFlag = readBranchFlag;

export const isBranchRepositoryEnabled = (): boolean =>
  readBranchFlag('FF_BRANCH_REPOSITORY_ENABLED');

export const setBranchFlagOverride = (flag: BranchSdkFeatureFlag, enabled: boolean): void => {
  if (typeof import.meta === 'undefined' || !import.meta.env) {
    return;
  }
  const isDev =
    import.meta.env.DEV === true || import.meta.env.VITE_APP_ENV === 'development';
  const isPreview = import.meta.env.VITE_APP_ENV === 'preview';
  if (!isDev && !isPreview) {
    console.warn(`${flag} overrides are not permitted in production.`);
    return;
  }
  try {
    localStorage.setItem(flag, String(enabled));
  } catch {
    // ignore
  }
};
