/**
 * BranchSDK — read-only branch repository port (M5 PR-1 foundation).
 * No Firestore types in this contract.
 */

import type { SdkAsyncResult } from '../../core/result';
import type { TenantId } from '../../core/types';
import type {
  BranchCapacityRecord,
  BranchDetail,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchListFilter,
  BranchRoutingPolicy,
  BranchStatusSnapshot,
  BranchSummary,
} from '../dto';
import type { BranchId } from '../types/branded';

export interface BranchRepository {
  listBranches(filter: BranchListFilter): SdkAsyncResult<BranchSummary[]>;

  getBranchById(branchId: BranchId): SdkAsyncResult<BranchDetail>;

  getBranchStatus(branchId: BranchId): SdkAsyncResult<BranchStatusSnapshot>;

  getBranchHours(branchId: BranchId): SdkAsyncResult<BranchHoursSnapshot>;

  getBranchCapacity(branchId: BranchId): SdkAsyncResult<BranchCapacityRecord>;

  getBranchInventory(branchId: BranchId): SdkAsyncResult<BranchInventorySnapshot>;

  getRoutingPolicy(tenantId: TenantId): SdkAsyncResult<BranchRoutingPolicy>;
}
