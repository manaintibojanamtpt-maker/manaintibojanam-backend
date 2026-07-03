/**
 * BranchSDK — stub operations repository (M5 PR-11).
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  BranchCapacityRecord,
  BranchHoursSnapshot,
  BranchInventorySnapshot,
  BranchStatusSnapshot,
} from '../dto';
import { branchNotConfiguredAsync } from '../adapters/notConfigured';
import type { BranchId } from '../types/branded';
import type {
  BranchOperationalSnapshotDto,
  BranchOperationsRepository,
} from './BranchOperationsRepository';

const LAYER = 'StubBranchOperationsRepository';

export class StubBranchOperationsRepository implements BranchOperationsRepository {
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

  getOperationalSnapshot(_branchId: BranchId): SdkAsyncResult<BranchOperationalSnapshotDto> {
    return branchNotConfiguredAsync('getOperationalSnapshot', LAYER);
  }
}

export const createStubBranchOperationsRepository = (): BranchOperationsRepository =>
  new StubBranchOperationsRepository();
