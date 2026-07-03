/**
 * BranchSDK — operations SDK public contract (M5 PR-12).
 */

import type { SdkAsyncResult } from '../../core/result';
import type { BranchOperationsAvailabilityDto, BranchOperationsAvailabilityQuery } from '../dto/operations';
import type { BranchId } from '../types/branded';
import type { BranchOperationalSnapshotDto } from '../operations/BranchOperationsRepository';
import type { CreateBranchOperationsSdkOptions } from '../operations-sdk/createBranchOperationsSdk.options';

export interface BranchOperationsSDK {
  getOperationalAvailability(
    query: BranchOperationsAvailabilityQuery
  ): SdkAsyncResult<BranchOperationsAvailabilityDto>;

  getOperationalSnapshot(branchId: BranchId): SdkAsyncResult<BranchOperationalSnapshotDto>;
}

export interface BranchOperationsSDKFactory {
  create(options?: CreateBranchOperationsSdkOptions): BranchOperationsSDK;
}
