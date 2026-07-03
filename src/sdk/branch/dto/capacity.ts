/**
 * BranchSDK — capacity DTOs (M5 PR-1 foundation).
 */

import type { BranchCongestionLevel, BranchId } from '../types/branded';

export interface BranchCapacitySnapshot {
  readonly branchId: BranchId;
  readonly activeOrders: number;
  readonly maxConcurrentOrders: number;
  readonly prepQueueMins: number;
  readonly congestionLevel: BranchCongestionLevel;
  readonly acceptingOrders: boolean;
  readonly capturedAt: number;
}

export interface BranchCapacityRecord extends BranchCapacitySnapshot {
  readonly tenantId: string;
}
