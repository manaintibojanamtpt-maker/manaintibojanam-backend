/**
 * SearchSDK — discovery enrichment flag resolution (M4 PR-6).
 */

import { readDiscoveryFlagDefault, type DiscoveryFeatureFlagReader } from '../../discovery/core/featureFlags';
import { readSearchFlagDefault, type SearchFeatureFlagReader } from '../core/featureFlags';
import type { CreateSearchSDKOptions } from '../shared/options';

export function resolveDiscoveryEnrichmentEnabled(options?: CreateSearchSDKOptions): boolean {
  const readSearch: SearchFeatureFlagReader = options?.featureFlags ?? readSearchFlagDefault;
  const readDiscovery: DiscoveryFeatureFlagReader =
    options?.discoveryFeatureFlags ?? readDiscoveryFlagDefault;

  return readSearch('FF_SEARCH_ENABLED') && readDiscovery('FF_DISCOVERY_ENABLED');
}
