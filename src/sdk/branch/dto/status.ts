/**
 * BranchSDK — live status DTOs (M5 PR-1 foundation).
 */

import type { BranchId, BranchKitchenState } from '../types/branded';

export interface BranchLiveStatus {
  readonly branchId: BranchId;
  readonly isOpen: boolean;
  readonly isBusy: boolean;
  readonly kitchenState: BranchKitchenState;
  readonly manualOverride?: {
    readonly isOpen: boolean;
    readonly reason?: string;
    readonly until?: number;
  };
  readonly updatedAt: number;
}

export interface BranchStatusSnapshot extends BranchLiveStatus {
  readonly tenantId: string;
}
