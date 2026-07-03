/**
 * BranchSDK — stub operations adapter (M5 PR-12).
 */

import type { SdkAsyncResult } from '../../core/result';
import type {
  BranchOperationsAvailabilityDto,
  BranchOperationsAvailabilityQuery,
} from '../dto/operations';
import type { BranchId } from '../types/branded';
import type { BranchOperationalSnapshotDto } from '../operations/BranchOperationsRepository';
import { branchNotConfiguredAsync } from '../adapters/notConfigured';
import type { BranchOperationsSDK } from './contracts/BranchOperationsSDK';

const LAYER = 'StubBranchOperationsAdapter';

export class StubBranchOperationsAdapter implements BranchOperationsSDK {
  getOperationalAvailability(
    _query: BranchOperationsAvailabilityQuery
  ): SdkAsyncResult<BranchOperationsAvailabilityDto> {
    return branchNotConfiguredAsync('getOperationalAvailability', LAYER);
  }

  getOperationalSnapshot(_branchId: BranchId): SdkAsyncResult<BranchOperationalSnapshotDto> {
    return branchNotConfiguredAsync('getOperationalSnapshot', LAYER);
  }
}

export const createStubBranchOperationsAdapter = (): BranchOperationsSDK =>
  new StubBranchOperationsAdapter();
