/**
 * M4 PR-4 — presentation feature flags for SearchSDK strangler rollout.
 */

import {
  SEARCH_SDK_FEATURE_FLAG_DEFAULTS,
  SEARCH_SDK_FEATURE_FLAG_ENV_KEYS,
  type SearchSdkFeatureFlag,
} from '../../sdk/search/core/featureFlags';

export type { SearchSdkFeatureFlag };

const readSearchFlag = (flag: SearchSdkFeatureFlag): boolean => {
  const envKey = SEARCH_SDK_FEATURE_FLAG_ENV_KEYS[flag];
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

  return SEARCH_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
};

export const isSearchEnabled = (): boolean => readSearchFlag('FF_SEARCH_ENABLED');

export const readSearchFeatureFlag = readSearchFlag;

export const isSearchRepositoryEnabled = (): boolean =>
  readSearchFlag('FF_SEARCH_REPOSITORY_ENABLED');

export const isSearchAutocompleteEnabled = (): boolean =>
  readSearchFlag('FF_SEARCH_AUTOCOMPLETE_ENABLED');

export const isSearchSuggestionsEnabled = (): boolean =>
  readSearchFlag('FF_SEARCH_SUGGESTIONS_ENABLED');

export const setSearchFlagOverride = (flag: SearchSdkFeatureFlag, enabled: boolean): void => {
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
