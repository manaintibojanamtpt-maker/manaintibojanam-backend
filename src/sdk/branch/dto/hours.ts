/**
 * BranchSDK — hours DTOs (M5 PR-1 foundation).
 */

import type { BranchId } from '../types/branded';

export interface BranchHoursRule {
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly openTime: string;
  readonly closeTime: string;
  readonly isClosed: boolean;
}

export interface BranchHoursException {
  readonly date: string;
  readonly isClosed: boolean;
  readonly openTime?: string;
  readonly closeTime?: string;
  readonly label?: string;
}

export interface BranchHoursSnapshot {
  readonly branchId: BranchId;
  readonly rules: readonly BranchHoursRule[];
  readonly exceptions?: readonly BranchHoursException[];
  readonly timezone?: string;
}
