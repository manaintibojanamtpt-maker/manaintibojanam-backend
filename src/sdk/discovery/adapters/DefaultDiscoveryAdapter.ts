/**
 * DiscoverySDK — default discovery adapter (M3 PR-3 / PR-4).
 * Delegates candidate reads to DiscoveryRepository; eligibility when engine is configured.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import { calculateDiscoveryDistanceKm } from '../../../domain/discovery/eligibility/DistanceCalculator';
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
import type { EligibilityEngine } from '../eligibility/EligibilityEnginePort';
import type { RankingContext, RankingEngine } from '../ranking/RankingEngine';
import type { DiscoveryRepository } from '../repository/DiscoveryRepository';
import { runDiscoveryPipelineAsync } from '../pipeline/DiscoveryPipeline';
import type { DiscoveryPipelineHooks } from '../pipeline/types';
import { discoveryNotConfiguredAsync } from './notConfigured';

const LAYER = 'DefaultDiscoveryAdapter';

export interface DefaultDiscoveryAdapterDeps {
  readonly repository: DiscoveryRepository;
  readonly eligibilityEngine?: EligibilityEngine;
  readonly rankingEngine?: RankingEngine;
  readonly useWeightedRanking?: boolean;
  readonly eligibilityEnabled?: boolean;
  readonly pipelineHooks?: DiscoveryPipelineHooks;
}

export class DefaultDiscoveryAdapter implements DiscoverySDK {
  constructor(private readonly deps: DefaultDiscoveryAdapterDeps) {}

  discoverNearby(query: DiscoveryQuery): SdkAsyncResult<DiscoveryResult> {
    return runDiscoveryPipelineAsync({
      query,
      repository: this.deps.repository,
      eligibilityEngine: this.deps.eligibilityEngine,
      rankingEngine: this.deps.rankingEngine,
      eligibilityEnabled: this.deps.eligibilityEnabled ?? false,
      useWeightedRanking: this.deps.useWeightedRanking ?? false,
      hooks: this.deps.pipelineHooks,
    });
  }

  findNearbyBranches(_filter: NearbyBranchFilter): SdkAsyncResult<NearbyBranch[]> {
    return discoveryNotConfiguredAsync('findNearbyBranches', LAYER);
  }

  findNearbyRestaurants(_filter: NearbyRestaurantFilter): SdkAsyncResult<NearbyRestaurant[]> {
    return discoveryNotConfiguredAsync('findNearbyRestaurants', LAYER);
  }

  getDiscoveryCandidates(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    return this.deps.repository.getDiscoveryCandidates(query);
  }

  calculateEligibility(
    candidate: DiscoveryCandidate,
    customerPoint: GeoPoint
  ): SdkAsyncResult<DeliveryEligibility> {
    if (!this.deps.eligibilityEngine) {
      return discoveryNotConfiguredAsync('calculateEligibility', LAYER);
    }

    const result = this.deps.eligibilityEngine.evaluateCandidate(candidate, customerPoint);
    if (result.ok === false) {
      return Promise.resolve(result);
    }

    return Promise.resolve(sdkOk(result.value.eligibility));
  }

  calculateDistance(from: GeoPoint, to: GeoPoint): SdkAsyncResult<number> {
    if (!this.deps.eligibilityEngine) {
      return discoveryNotConfiguredAsync('calculateDistance', LAYER);
    }

    return Promise.resolve(sdkOk(calculateDiscoveryDistanceKm(from, to)));
  }

  rankCandidates(
    candidates: readonly EligibleCandidate[],
    context: RankingContext
  ): SdkAsyncResult<RankedCandidate[]> {
    if (!this.deps.rankingEngine) {
      return discoveryNotConfiguredAsync('rankCandidates', LAYER);
    }

    const useWeightedRanking = context.useWeightedRanking ?? this.deps.useWeightedRanking ?? false;
    const result = this.deps.rankingEngine.rank(candidates, {
      ...context,
      useWeightedRanking,
    });

    return Promise.resolve(result);
  }

  searchByCuisine(filter: SearchFilter): SdkAsyncResult<NearbyRestaurant[]> {
    return discoveryNotConfiguredAsync('searchByCuisine', LAYER);
  }

  searchByName(filter: SearchFilter): SdkAsyncResult<NearbyRestaurant[]> {
    return discoveryNotConfiguredAsync('searchByName', LAYER);
  }
}

export function createDefaultDiscoveryAdapter(deps: DefaultDiscoveryAdapterDeps): DiscoverySDK {
  return new DefaultDiscoveryAdapter(deps);
}
