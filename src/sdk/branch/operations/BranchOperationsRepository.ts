/**
 * BranchSDK — operational snapshot DTOs (M5 PR-11).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { TenantId } from '../../core/types';
import type {
  BranchCapacityRecord,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
} from '../dto';
import type { BranchId } from '../types/branded';

export interface BranchOperationalSnapshotDto {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly status: BranchStatusSnapshot;
  readonly hours: BranchHoursSnapshot;
  readonly capacity: BranchCapacityRecord;
  readonly inventory: BranchInventorySnapshot;
  readonly capturedAt: number;
}

/**
 * Read-only operations repository — I/O only, no business decisions.
 */
export interface BranchOperationsRepository {
  getBranchStatus(branchId: BranchId): SdkAsyncResult<BranchStatusSnapshot>;

  getBranchHours(branchId: BranchId): SdkAsyncResult<BranchHoursSnapshot>;

  getBranchCapacity(branchId: BranchId): SdkAsyncResult<BranchCapacityRecord>;

  getBranchInventory(branchId: BranchId): SdkAsyncResult<BranchInventorySnapshot>;

  getOperationalSnapshot(branchId: BranchId): SdkAsyncResult<BranchOperationalSnapshotDto>;
}
