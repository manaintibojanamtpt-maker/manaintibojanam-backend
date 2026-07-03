/**
 * BranchSDK — branch score DTOs (M5 PR-1 foundation).
 */

import type { BranchId } from '../types/branded';

export type BranchScoreSignal =
  | 'distance'
  | 'eta'
  | 'delivery_fee'
  | 'capacity_headroom'
  | 'inventory_availability'
  | 'rating'
  | 'open_status';

export interface BranchScoreFactor {
  readonly signal: BranchScoreSignal;
  readonly weight: number;
  readonly contribution: number;
  readonly label: string;
}

export interface BranchScore {
  readonly branchId: BranchId;
  readonly total: number;
  readonly factors: readonly BranchScoreFactor[];
}

export interface BranchScoreInput {
  readonly branchId: BranchId;
  readonly distanceKm: number;
  readonly etaMins?: number;
  readonly deliveryFee?: number;
  readonly capacityHeadroom?: number;
  readonly inventoryCoverage?: number;
  readonly rating?: number;
  readonly isOpen?: boolean;
}
