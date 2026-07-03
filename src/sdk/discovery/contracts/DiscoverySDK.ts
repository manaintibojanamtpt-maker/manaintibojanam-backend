/**
 * DiscoverySDK — public contract (interface only; M3 foundation).
 * ADR-011: read-only discovery intelligence strangler slice.
 *
 * No Firestore, REST, or UI in this contract.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { GeoPoint } from '../../location/dto/geo';
import type {
  DiscoveryQuery,
  DiscoveryResult,
  NearbyBranchFilter,
  NearbyBranch,
  NearbyRestaurantFilter,
  NearbyRestaurant,
  SearchFilter,
} from '../dto';
import type { DiscoveryCandidate } from '../dto/candidates';
import type { DeliveryEligibility } from '../dto/eligibility';
import type { EligibleCandidate } from '../dto/eligibleCandidate';
import type { RankedCandidate } from '../dto/rankedCandidate';
import type { RankingContext } from '../ranking/RankingEngine';
import type { CreateDiscoverySDKOptions } from '../shared/options';

/**
 * Public discovery SDK surface for presentation layer.
 * Implementations arrive in M3 PR-2+ adapters — not in foundation PR.
 */
export interface DiscoverySDK {
  /** Primary discovery entry — location → ranked results. */
  discoverNearby(query: DiscoveryQuery): SdkAsyncResult<DiscoveryResult>;

  /** Tenant-scoped nearby branches. */
  findNearbyBranches(filter: NearbyBranchFilter): SdkAsyncResult<NearbyBranch[]>;

  /** Marketplace nearby restaurants. */
  findNearbyRestaurants(filter: NearbyRestaurantFilter): SdkAsyncResult<NearbyRestaurant[]>;

  /** Pre-rank candidate set from repository. */
  getDiscoveryCandidates(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]>;

  /** Delivery radius / fee eligibility for a candidate. */
  calculateEligibility(
    candidate: DiscoveryCandidate,
    customerPoint: GeoPoint
  ): SdkAsyncResult<DeliveryEligibility>;

  /** Distance calculation — delegates to LocationSDK. */
  calculateDistance(from: GeoPoint, to: GeoPoint): SdkAsyncResult<number>;

  /** Deterministic ranking with explainable reasons. */
  rankCandidates(
    candidates: readonly EligibleCandidate[],
    context: RankingContext
  ): SdkAsyncResult<RankedCandidate[]>;

  /** Cuisine tag search within geo context. */
  searchByCuisine(filter: SearchFilter): SdkAsyncResult<NearbyRestaurant[]>;

  /** Name/text search within geo context. */
  searchByName(filter: SearchFilter): SdkAsyncResult<NearbyRestaurant[]>;
}

export interface DiscoverySDKFactory {
  create(options?: CreateDiscoverySDKOptions): DiscoverySDK;
}
