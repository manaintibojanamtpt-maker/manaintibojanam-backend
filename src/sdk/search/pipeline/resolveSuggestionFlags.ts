/**
 * SearchSDK — autocomplete / suggestion feature flag resolution (M4 PR-9).
 */

import {
  readSearchFlagDefault,
  type SearchFeatureFlagReader,
} from '../core/featureFlags';
import type { CreateSearchSDKOptions } from '../shared/options';

export function resolveAutocompleteEnabled(options?: CreateSearchSDKOptions): boolean {
  const readFlag: SearchFeatureFlagReader = options?.featureFlags ?? readSearchFlagDefault;
  return readFlag('FF_SEARCH_ENABLED') && readFlag('FF_SEARCH_AUTOCOMPLETE_ENABLED');
}

export function resolveSuggestionsEnabled(options?: CreateSearchSDKOptions): boolean {
  const readFlag: SearchFeatureFlagReader = options?.featureFlags ?? readSearchFlagDefault;
  return readFlag('FF_SEARCH_ENABLED') && readFlag('FF_SEARCH_SUGGESTIONS_ENABLED');
}
