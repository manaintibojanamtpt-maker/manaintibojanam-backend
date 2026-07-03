/**
 * BranchSDK — stub branch repository (M5 PR-3).
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
import { branchNotConfiguredAsync } from '../adapters/notConfigured';
import type { BranchId } from '../types/branded';
import type { BranchRepository } from './BranchRepository';

const LAYER = 'StubBranchRepository';

export class StubBranchRepository implements BranchRepository {
  listBranches(_filter: BranchListFilter): SdkAsyncResult<BranchSummary[]> {
    return branchNotConfiguredAsync('listBranches', LAYER);
  }

  getBranchById(_branchId: BranchId): SdkAsyncResult<BranchDetail> {
    return branchNotConfiguredAsync('getBranchById', LAYER);
  }

  getBranchStatus(_branchId: BranchId): SdkAsyncResult<BranchStatusSnapshot> {
    return branchNotConfiguredAsync('getBranchStatus', LAYER);
  }

  getBranchHours(_branchId: BranchId): SdkAsyncResult<BranchHoursSnapshot> {
    return branchNotConfiguredAsync('getBranchHours', LAYER);
  }

  getBranchCapacity(_branchId: BranchId): SdkAsyncResult<BranchCapacityRecord> {
    return branchNotConfiguredAsync('getBranchCapacity', LAYER);
  }

  getBranchInventory(_branchId: BranchId): SdkAsyncResult<BranchInventorySnapshot> {
    return branchNotConfiguredAsync('getBranchInventory', LAYER);
  }

  getRoutingPolicy(_tenantId: TenantId): SdkAsyncResult<BranchRoutingPolicy> {
    return branchNotConfiguredAsync('getRoutingPolicy', LAYER);
  }
}

export const createStubBranchRepository = (): BranchRepository => new StubBranchRepository();
