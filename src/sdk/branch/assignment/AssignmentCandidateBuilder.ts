/**
 * BranchSDK — build operational snapshots for assignment (M5 PR-7).
 */

import type { DiscoveryCandidate } from '../../discovery/dto/candidates';
import type { SdkAsyncResult } from '../../core/result';
import { isSdkSuccess, sdkOk } from '../../core/resultHelpers';
import type { BranchOperationalSnapshot } from '../../../domain/branch/shared/BranchTypes';
import type { BranchSelectionQuery } from '../dto/queries';
import type { BranchId } from '../types/branded';
import type { BranchRepository } from '../repository/BranchRepository';
import {
  mapReadBundleToOperationalSnapshot,
  type BranchOperationalReadBundle,
} from '../adapters/BranchDomainMapper';
import { mapRepositoryResultToSdk } from '../adapters/BranchErrorMapper';
import { filterExcludedBranchIds } from './AssignmentPolicyResolver';

export interface AssignmentCandidateSeed {
  readonly branchId: BranchId;
  readonly discoveryCandidate?: DiscoveryCandidate;
}

export const buildCandidateSeedsFromDiscovery = (
  query: BranchSelectionQuery,
  discoveryCandidates: readonly DiscoveryCandidate[]
): AssignmentCandidateSeed[] =>
  filterExcludedBranchIds(
    discoveryCandidates
      .filter((candidate) => String(candidate.tenantId) === String(query.tenantId))
      .map((candidate) => candidate.branchId),
    query
  ).map((branchId) => ({
    branchId,
    discoveryCandidate: discoveryCandidates.find(
      (candidate) => String(candidate.branchId) === String(branchId)
    ),
  }));

export const buildCandidateSeedsFromBranchIds = (
  query: BranchSelectionQuery,
  branchIds: readonly BranchId[]
): AssignmentCandidateSeed[] =>
  filterExcludedBranchIds(branchIds, query).map((branchId) => ({ branchId }));

const loadBranchReadBundle = async (
  repository: BranchRepository,
  branchId: BranchId
): Promise<SdkAsyncResult<BranchOperationalReadBundle>> => {
  const detailResult = mapRepositoryResultToSdk(await repository.getBranchById(branchId));
  if (!isSdkSuccess(detailResult)) {
    return detailResult;
  }

  const [statusRaw, capacityRaw, inventoryRaw] = await Promise.all([
    repository.getBranchStatus(branchId),
    repository.getBranchCapacity(branchId),
    repository.getBranchInventory(branchId),
  ]);

  const statusResult = mapRepositoryResultToSdk(statusRaw);
  const capacityResult = mapRepositoryResultToSdk(capacityRaw);
  const inventoryResult = mapRepositoryResultToSdk(inventoryRaw);

  if (!isSdkSuccess(statusResult)) {
    return statusResult;
  }
  if (!isSdkSuccess(capacityResult)) {
    return capacityResult;
  }
  if (!isSdkSuccess(inventoryResult)) {
    return inventoryResult;
  }

  const detail = detailResult.value;

  return sdkOk({
    summary: {
      branchId: detail.branchId,
      tenantId: detail.tenantId,
      name: detail.name,
      slug: detail.slug,
      status: detail.status,
      isDefault: detail.isDefault,
    },
    detail,
    status: statusResult.value,
    capacity: capacityResult.value,
    inventory: inventoryResult.value,
  });
};

export const loadOperationalSnapshot = async (
  repository: BranchRepository,
  seed: AssignmentCandidateSeed,
  customerPoint: BranchSelectionQuery['customerPoint']
): Promise<SdkAsyncResult<BranchOperationalSnapshot>> => {
  const bundle = await loadBranchReadBundle(repository, seed.branchId);
  if (!isSdkSuccess(bundle)) {
    return bundle;
  }

  const snapshot = mapReadBundleToOperationalSnapshot(bundle.value, customerPoint);

  if (seed.discoveryCandidate && Number.isFinite(seed.discoveryCandidate.distanceKm)) {
    return sdkOk({
      ...snapshot,
      distanceKm: seed.discoveryCandidate.distanceKm,
    });
  }

  return sdkOk(snapshot);
};

export const loadOperationalSnapshots = async (
  repository: BranchRepository,
  seeds: readonly AssignmentCandidateSeed[],
  customerPoint: BranchSelectionQuery['customerPoint']
): Promise<SdkAsyncResult<readonly BranchOperationalSnapshot[]>> => {
  const snapshots: BranchOperationalSnapshot[] = [];

  for (const seed of seeds) {
    const loaded = await loadOperationalSnapshot(repository, seed, customerPoint);
    if (!isSdkSuccess(loaded)) {
      return loaded;
    }
    snapshots.push(loaded.value);
  }

  return sdkOk(snapshots);
};

export const resolveRepositoryBranchIds = async (
  repository: BranchRepository,
  query: BranchSelectionQuery
): Promise<SdkAsyncResult<readonly BranchId[]>> => {
  const listed = mapRepositoryResultToSdk(
    await repository.listBranches({ tenantId: query.tenantId })
  );

  if (!isSdkSuccess(listed)) {
    return listed;
  }

  return sdkOk(filterExcludedBranchIds(listed.value.map((branch) => branch.branchId), query));
};
