/**
 * Branch domain — operational availability summary types (M5 PR-10).
 */

import type { BranchId, BranchOperationalStatus } from '../shared/BranchTypes';

export type BranchHoursStatus = 'open' | 'closed' | 'unknown';

export type BranchCapacityStatus = 'available' | 'limited' | 'full' | 'unknown';

export type BranchInventoryStatus =
  | 'complete'
  | 'partial'
  | 'unavailable'
  | 'not_applicable';

export interface BranchHoursEvaluation {
  readonly status: BranchHoursStatus;
  readonly isOpen: boolean;
  readonly reasons: readonly string[];
}

export interface BranchCapacityEvaluation {
  readonly status: BranchCapacityStatus;
  readonly isAvailable: boolean;
  readonly activeOrders: number;
  readonly maxConcurrentOrders: number;
  readonly utilizationRatio: number;
  readonly reasons: readonly string[];
}

export interface BranchInventoryEvaluation {
  readonly status: BranchInventoryStatus;
  readonly isSufficient: boolean;
  readonly requestedCount: number;
  readonly unavailableCount: number;
  readonly missingItemIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface BranchOperationalStatusEvaluation {
  readonly isActive: boolean;
  readonly status: BranchOperationalStatus;
  readonly reasons: readonly string[];
}

export interface BranchAvailabilitySummary {
  readonly branchId: BranchId;
  readonly isOperationallyAvailable: boolean;
  readonly hours: BranchHoursEvaluation;
  readonly capacity: BranchCapacityEvaluation;
  readonly inventory: BranchInventoryEvaluation;
  readonly operationalStatus: BranchOperationalStatusEvaluation;
  readonly blockers: readonly string[];
  readonly evaluatedAt: number;
}

export interface BranchAvailabilitySummaryDisabled {
  readonly branchId: BranchId;
  readonly enabled: false;
  readonly evaluatedAt: number;
}

export type BranchOperationsAvailabilityResult =
  | {
      readonly enabled: true;
      readonly summary: BranchAvailabilitySummary;
    }
  | {
      readonly enabled: false;
      readonly summary: BranchAvailabilitySummaryDisabled;
    };

export interface BranchDayHours {
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly openMinute: number;
  readonly closeMinute: number;
}

export interface BranchOperationsContext {
  readonly cartItemIds?: readonly string[];
  readonly requireFullInventoryCoverage?: boolean;
  readonly evaluatedAt?: number;
  readonly weeklyHours?: readonly BranchDayHours[];
  readonly operationsEnabled?: boolean;
}

export const createDisabledAvailabilitySummary = (
  branchId: BranchId,
  evaluatedAt: number
): BranchAvailabilitySummaryDisabled => ({
  branchId,
  enabled: false,
  evaluatedAt,
});
