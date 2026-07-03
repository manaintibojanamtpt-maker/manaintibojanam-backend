/**
 * DiscoverySDK — stub discovery repository (M3 PR-2).
 */

import type { SdkAsyncResult } from '../../../core/result';
import type { DiscoveryRepository } from '../DiscoveryRepository';
import type { DiscoveryCandidate, DiscoveryQuery, NearbyBranchFilter, SearchFilter } from '../../dto';
import { discoveryNotConfiguredAsync } from '../../adapters/notConfigured';

const LAYER = 'StubDiscoveryRepository';

export class StubDiscoveryRepository implements DiscoveryRepository {
  findNearbyBranches(_filter: NearbyBranchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('findNearbyBranches', LAYER);
  }

  findNearbyRestaurants(_query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('findNearbyRestaurants', LAYER);
  }

  getDiscoveryCandidates(_query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('getDiscoveryCandidates', LAYER);
  }

  searchByCuisine(_filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('searchByCuisine', LAYER);
  }

  searchByName(_filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('searchByName', LAYER);
  }
}

export function createStubDiscoveryRepository(): DiscoveryRepository {
  return new StubDiscoveryRepository();
}
