/**
 * BranchSDK — inventory DTOs (M5 PR-1 foundation).
 */

import type { BranchId } from '../types/branded';

export interface BranchInventoryItem {
  readonly menuItemId: string;
  readonly available: boolean;
  readonly quantity?: number;
}

export interface BranchInventorySnapshot {
  readonly branchId: BranchId;
  readonly items: readonly BranchInventoryItem[];
  readonly unavailableItemIds: readonly string[];
  readonly capturedAt: number;
}
