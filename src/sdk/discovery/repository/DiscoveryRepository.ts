/**
 * DiscoverySDK — repository port (read-only; M3 foundation).
 * No Firestore types in this contract.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { DiscoveryCandidate, DiscoveryQuery, NearbyBranchFilter, SearchFilter } from '../dto';

export interface DiscoveryRepository {
  findNearbyBranches(filter: NearbyBranchFilter): SdkAsyncResult<DiscoveryCandidate[]>;

  findNearbyRestaurants(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]>;

  getDiscoveryCandidates(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]>;

  searchByCuisine(filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]>;

  searchByName(filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]>;
}

export interface DiscoveryRepositoryFactory {
  create(): DiscoveryRepository;
}
