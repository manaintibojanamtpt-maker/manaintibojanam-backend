/**
 * SearchSDK — pipeline feature flag resolution (M4 PR-5).
 */

import {
  readSearchFlagDefault,
  type SearchFeatureFlagReader,
} from '../core/featureFlags';
import { readDiscoveryFlagDefault, type DiscoveryFeatureFlagReader } from '../../discovery/core/featureFlags';
import type { SearchPipelineFlags } from '../dto/results';
import type { CreateSearchSDKOptions } from '../shared/options';

export function resolveSearchPipelineFlags(
  options?: Pick<CreateSearchSDKOptions, 'featureFlags' | 'discoveryFeatureFlags'>
): SearchPipelineFlags {
  const readFlag: SearchFeatureFlagReader = options?.featureFlags ?? readSearchFlagDefault;
  const readDiscovery: DiscoveryFeatureFlagReader =
    options?.discoveryFeatureFlags ?? readDiscoveryFlagDefault;

  return {
    searchEnabled: readFlag('FF_SEARCH_ENABLED'),
    discoveryEnabled: readDiscovery('FF_DISCOVERY_ENABLED'),
    autocompleteEnabled: readFlag('FF_SEARCH_AUTOCOMPLETE_ENABLED'),
    suggestionsEnabled: readFlag('FF_SEARCH_SUGGESTIONS_ENABLED'),
  };
}
