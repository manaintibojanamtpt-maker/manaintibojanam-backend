/**
 * DiscoverySDK — geoIndex-backed DiscoveryRepository adapter (M3 PR-7).
 * Returns DiscoveryCandidate[] only — no ranking, eligibility, or sorting beyond stable ID order.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { DiscoveryRepository } from './DiscoveryRepository';
import type { DiscoveryCandidate, DiscoveryQuery, NearbyBranchFilter, SearchFilter } from '../dto';
import type { GeoIndexRepository } from './GeoIndexRepository';
import { discoveryNotConfiguredAsync } from '../adapters/notConfigured';

const LAYER = 'GeoIndexRepositoryAdapter';

const applyLimit = (
  candidates: readonly DiscoveryCandidate[],
  limit?: number
): DiscoveryCandidate[] => {
  if (!limit || limit <= 0) {
    return [...candidates];
  }
  return candidates.slice(0, limit);
};

export interface GeoIndexRepositoryAdapterDeps {
  readonly geoIndexRepository: GeoIndexRepository;
  readonly fallbackRepository: DiscoveryRepository;
}

export class GeoIndexRepositoryAdapter implements DiscoveryRepository {
  constructor(private readonly deps: GeoIndexRepositoryAdapterDeps) {}

  async getDiscoveryCandidates(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    const result = await this.deps.geoIndexRepository.getDiscoveryCandidates(query);
    if (result.ok === false) {
      return this.deps.fallbackRepository.getDiscoveryCandidates(query);
    }

    return sdkOk(applyLimit(result.value.candidates, query.limit));
  }

  async findNearbyRestaurants(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    return this.getDiscoveryCandidates(query);
  }

  async findNearbyBranches(filter: NearbyBranchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return this.deps.fallbackRepository.findNearbyBranches(filter);
  }

  searchByCuisine(_filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('searchByCuisine', LAYER);
  }

  searchByName(_filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('searchByName', LAYER);
  }
}

export function createGeoIndexRepositoryAdapter(
  deps: GeoIndexRepositoryAdapterDeps
): DiscoveryRepository {
  return new GeoIndexRepositoryAdapter(deps);
}
