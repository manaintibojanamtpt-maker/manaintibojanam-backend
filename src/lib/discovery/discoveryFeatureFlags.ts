/**
 * M3 PR-2 — presentation feature flags for DiscoverySDK strangler rollout.
 * All flags default OFF — zero behaviour change until PR-3+.
 */

import {
  DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS,
  DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS,
  type DiscoverySdkFeatureFlag,
} from '../../sdk/discovery/core/featureFlags';

export type { DiscoverySdkFeatureFlag };

const readDiscoveryFlag = (flag: DiscoverySdkFeatureFlag): boolean => {
  const envKey = DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS[flag];
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

  return DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
};

export const isDiscoveryEnabled = (): boolean => readDiscoveryFlag('FF_DISCOVERY_ENABLED');

export const readDiscoveryFeatureFlag = readDiscoveryFlag;

export const isDiscoveryRankingEnabled = (): boolean =>
  readDiscoveryFlag('FF_DISCOVERY_RANKING_ENABLED');

export const isDiscoveryMarketplaceEnabled = (): boolean =>
  readDiscoveryFlag('FF_DISCOVERY_MARKETPLACE_ENABLED');

export const isDiscoveryTenantRepositoryEnabled = (): boolean =>
  readDiscoveryFlag('FF_DISCOVERY_TENANT_REPOSITORY_ENABLED');

export const resolveDiscoveryProviderKind = (): 'tenant-scan' | 'stub' =>
  isDiscoveryTenantRepositoryEnabled() ? 'tenant-scan' : 'stub';

export const setDiscoveryFlagOverride = (
  flag: DiscoverySdkFeatureFlag,
  enabled: boolean
): void => {
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
