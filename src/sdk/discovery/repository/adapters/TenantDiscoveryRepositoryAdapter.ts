/**
 * DiscoverySDK — tenant-as-branch repository adapter (M3 PR-3 / M5 PR-6).
 * Returns DiscoveryCandidate[] only — no distance, ranking, eligibility, or branch selection.
 */

import type { SdkAsyncResult } from '../../../core/result';
import { sdkOk } from '../../../core/resultHelpers';
import type { DiscoveryRepository } from '../DiscoveryRepository';
import type { DiscoveryCandidate, DiscoveryQuery, NearbyBranchFilter, SearchFilter } from '../../dto';
import type { TenantReadRecord, TenantRepositoryPort } from '../ports/TenantRepositoryPort';
import { resolveDiscoveryBranchCandidates } from '../../branch/BranchCandidateResolver';
import type { BranchCandidateResolverDeps } from '../../branch/BranchCandidateResolver';
import { discoveryNotConfiguredAsync } from '../../adapters/notConfigured';

const LAYER = 'TenantDiscoveryRepositoryAdapter';

const applyLimit = (
  candidates: readonly DiscoveryCandidate[],
  limit?: number
): DiscoveryCandidate[] => {
  if (!limit || limit <= 0) {
    return [...candidates];
  }
  return candidates.slice(0, limit);
};

export interface TenantDiscoveryRepositoryAdapterOptions extends BranchCandidateResolverDeps {}

export class TenantDiscoveryRepositoryAdapter implements DiscoveryRepository {
  constructor(
    private readonly tenantRepository: TenantRepositoryPort,
    private readonly branchOptions: TenantDiscoveryRepositoryAdapterOptions = {}
  ) {}

  private async mapTenantsToCandidates(
    tenants: readonly TenantReadRecord[]
  ): SdkAsyncResult<DiscoveryCandidate[]> {
    const expanded = await resolveDiscoveryBranchCandidates({
      tenants,
      ...this.branchOptions,
    });

    if (expanded.ok === false) {
      return expanded;
    }

    return sdkOk([...expanded.value.candidates]);
  }

  async getDiscoveryCandidates(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    const tenants = await this.tenantRepository.listActiveTenants();
    if (tenants.ok === false) {
      return tenants;
    }

    const candidates = await this.mapTenantsToCandidates(tenants.value);
    if (candidates.ok === false) {
      return candidates;
    }

    return sdkOk(applyLimit(candidates.value, query.limit));
  }

  async findNearbyRestaurants(query: DiscoveryQuery): SdkAsyncResult<DiscoveryCandidate[]> {
    return this.getDiscoveryCandidates(query);
  }

  async findNearbyBranches(filter: NearbyBranchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    const tenants = await this.tenantRepository.listActiveTenants();
    if (tenants.ok === false) {
      return tenants;
    }

    const scopedTenants = tenants.value.filter((tenant) => tenant.id === filter.tenantId);
    const candidates = await this.mapTenantsToCandidates(scopedTenants);
    if (candidates.ok === false) {
      return candidates;
    }

    return sdkOk(applyLimit(candidates.value, filter.limit));
  }

  searchByCuisine(_filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('searchByCuisine', LAYER);
  }

  searchByName(_filter: SearchFilter): SdkAsyncResult<DiscoveryCandidate[]> {
    return discoveryNotConfiguredAsync('searchByName', LAYER);
  }
}

export function createTenantDiscoveryRepositoryAdapter(
  tenantRepository: TenantRepositoryPort,
  options: TenantDiscoveryRepositoryAdapterOptions = {}
): DiscoveryRepository {
  return new TenantDiscoveryRepositoryAdapter(tenantRepository, options);
}
