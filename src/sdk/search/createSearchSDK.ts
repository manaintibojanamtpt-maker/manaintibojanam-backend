/**
 * SearchSDK factory — stub or default adapter by feature flag (M4 PR-5 / PR-6).
 */

import { createDiscoverySDK } from '../discovery/createDiscoverySDK';
import type { SearchSDK, SearchSDKFactory } from './contracts/SearchSDK';
import { createDefaultSearchAdapter } from './adapters/DefaultSearchAdapter';
import { createStubSearchAdapter } from './adapters/StubSearchAdapter';
import {
  readSearchFlagDefault,
  type SearchFeatureFlagReader,
} from './core/featureFlags';
import { resolveDiscoveryEnrichmentEnabled } from './pipeline/resolveDiscoveryEnrichment';
import {
  createSearchRepository,
  resolveSearchRepositoryEnabled,
} from './repository/SearchRepositoryFactory';
import type { CreateSearchSDKOptions } from './shared/options';

export function resolveSearchEnabled(options?: CreateSearchSDKOptions): boolean {
  const readFlag: SearchFeatureFlagReader = options?.featureFlags ?? readSearchFlagDefault;
  return readFlag('FF_SEARCH_ENABLED');
}

export function createSearchSDK(options: CreateSearchSDKOptions = {}): SearchSDK {
  if (!resolveSearchEnabled(options)) {
    return createStubSearchAdapter();
  }

  const repository =
    options.searchRepository ??
    createSearchRepository({
      firestoreSearchPort: options.firestoreSearchPort,
      featureFlags: options.featureFlags,
    });

  const discoverySdk =
    options.discoverySdk ??
    createDiscoverySDK({
      featureFlags: options.discoveryFeatureFlags,
    });

  return createDefaultSearchAdapter({
    repository,
    repositoryEnabled: resolveSearchRepositoryEnabled({
      featureFlags: options.featureFlags,
    }),
    discoverySdk,
    discoveryEnabled: resolveDiscoveryEnrichmentEnabled(options),
    featureFlags: options.featureFlags,
    discoveryFeatureFlags: options.discoveryFeatureFlags,
  });
}

export const searchSdkFactory: SearchSDKFactory = {
  create: (options?: CreateSearchSDKOptions) => createSearchSDK(options),
};

export { StubSearchAdapter, createStubSearchAdapter } from './adapters/StubSearchAdapter';
export { DefaultSearchAdapter, createDefaultSearchAdapter } from './adapters/DefaultSearchAdapter';
export { searchNotConfigured, searchNotConfiguredAsync } from './adapters/notConfigured';
