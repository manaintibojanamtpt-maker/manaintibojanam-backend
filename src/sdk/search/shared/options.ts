/**
 * SearchSDK — factory options (contracts only; M4 PR-1).
 */

import type { DiscoveryFeatureFlagReader } from '../../discovery/core/featureFlags';
import type { DiscoverySDK } from '../../discovery/contracts/DiscoverySDK';
import type { SearchFeatureFlagReader } from '../core/featureFlags';
import type { SearchRepository } from '../repository/SearchRepository';
import type { FirestoreSearchPort } from '../repository/FirestoreSearchPort';
import type { SearchProviderKind } from '../types/branded';

export interface CreateSearchSDKOptions {
  readonly discoverySdk?: DiscoverySDK;
  readonly searchRepository?: SearchRepository;
  readonly firestoreSearchPort?: FirestoreSearchPort;
  readonly providerKind?: SearchProviderKind;
  readonly featureFlags?: SearchFeatureFlagReader;
  readonly discoveryFeatureFlags?: DiscoveryFeatureFlagReader;
}
