/**
 * DiscoverySDK — stub adapter (M3 PR-2).
 * All methods return NOT_CONFIGURED until repository PR lands.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { GeoPoint } from '../../location/dto/geo';
import type { DiscoverySDK } from '../contracts/DiscoverySDK';
import type {
  DiscoveryQuery,
  DiscoveryResult,
  NearbyBranch,
  NearbyBranchFilter,
  NearbyRestaurant,
  NearbyRestaurantFilter,
  SearchFilter,
} from '../dto';
import type { DiscoveryCandidate } from '../dto/candidates';
import type { DeliveryEligibility } from '../dto/eligibility';
import type { EligibleCandidate } from '../dto/eligibleCandidate';
import type { RankedCandidate } from '../dto/rankedCandidate';
import type { RankingContext } from '../ranking/RankingEngine';
import { discoveryNotConfiguredAsync } from './notConfigured';

const LAYER = 'StubDiscoveryAdapter';

export class StubDiscoveryAdapter implements DiscoverySDK {
  discoverNearby(_query: DiscoveryQuery): SdkAsyncResult<DiscoveryResult> {
    return discoveryNotConfiguredAsync('discoverNearby', LAYER);
  }

  findNearbyBranches(_filter: NearbyBranchFilter): SdkAsyncResult<NearbyBranch[]> {
    return discoveryNotConfiguredAsync('findNearbyBranches', LAYER);
  }

  findNearbyRestaurants(_filter: NearbyRestaurantFilter): SdkAsyncResult<NearbyRestaurant[]> {
    return discoveryNotConfiguredAsync('findNearbyRestaurants', LAYER);
  }

  getDiscoveryCandidates(_query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('getDiscoveryCandidates', LAYER);
  }

  calculateEligibility(
    _candidate: DiscoveryCandidate,
    _customerPoint: GeoPoint
  ): SdkAsyncResult<DeliveryEligibility> {
    return discoveryNotConfiguredAsync('calculateEligibility', LAYER);
  }

  calculateDistance(_from: GeoPoint, _to: GeoPoint): SdkAsyncResult<number> {
    return discoveryNotConfiguredAsync('calculateDistance', LAYER);
  }

  rankCandidates(
    _candidates: readonly EligibleCandidate[],
    _context: RankingContext
  ): SdkAsyncResult<RankedCandidate[]> {
    return discoveryNotConfiguredAsync('rankCandidates', LAYER);
  }

  searchByCuisine(_filter: SearchFilter): SdkAsyncResult<NearbyRestaurant[]> {
    return discoveryNotConfiguredAsync('searchByCuisine', LAYER);
  }

  searchByName(_filter: SearchFilter): SdkAsyncResult<NearbyRestaurant[]> {
    return discoveryNotConfiguredAsync('searchByName', LAYER);
  }
}

export function createStubDiscoveryAdapter(): DiscoverySDK {
  return new StubDiscoveryAdapter();
}
