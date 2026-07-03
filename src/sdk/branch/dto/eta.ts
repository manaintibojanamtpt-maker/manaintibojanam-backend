/**
 * BranchSDK — ETA DTOs (M5 PR-1 foundation).
 */

import type { BranchId } from '../types/branded';

export interface BranchETAEstimate {
  readonly branchId: BranchId;
  readonly prepTimeMins: number;
  readonly deliveryTimeMins: number;
  readonly totalMins: number;
  readonly confidence: 'low' | 'medium' | 'high';
}
