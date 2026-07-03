/**
 * SearchSDK feature flags (M4 foundation).
 * All flags default OFF — zero production impact until PR-2+.
 */

export type SearchSdkFeatureFlag =
  | 'FF_SEARCH_ENABLED'
  | 'FF_SEARCH_AUTOCOMPLETE_ENABLED'
  | 'FF_SEARCH_SUGGESTIONS_ENABLED'
  | 'FF_SEARCH_REPOSITORY_ENABLED';

export const SEARCH_SDK_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_SEARCH_ENABLED: false,
    FF_SEARCH_AUTOCOMPLETE_ENABLED: false,
    FF_SEARCH_SUGGESTIONS_ENABLED: false,
    FF_SEARCH_REPOSITORY_ENABLED: false,
  },
} as const;

export const SEARCH_SDK_FEATURE_FLAG_ENV_KEYS: Record<SearchSdkFeatureFlag, string> = {
  FF_SEARCH_ENABLED: 'VITE_FF_SEARCH_ENABLED',
  FF_SEARCH_AUTOCOMPLETE_ENABLED: 'VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED',
  FF_SEARCH_SUGGESTIONS_ENABLED: 'VITE_FF_SEARCH_SUGGESTIONS_ENABLED',
  FF_SEARCH_REPOSITORY_ENABLED: 'VITE_FF_SEARCH_REPOSITORY_ENABLED',
};

export type SearchFeatureFlagReader = (flag: SearchSdkFeatureFlag) => boolean;

export const readSearchFlagDefault = (flag: SearchSdkFeatureFlag): boolean =>
  SEARCH_SDK_FEATURE_FLAG_DEFAULTS.flags[flag];
