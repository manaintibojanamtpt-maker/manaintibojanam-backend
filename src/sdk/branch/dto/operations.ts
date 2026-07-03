/**
 * BranchSDK — operations availability DTOs (M5 PR-12).
 */

import type { BranchId, BranchStatusValue } from '../types/branded';

export type BranchOperationsHoursStatusDto = 'open' | 'closed' | 'unknown';

export type BranchOperationsCapacityStatusDto = 'available' | 'limited' | 'full' | 'unknown';

export type BranchOperationsInventoryStatusDto =
  | 'complete'
  | 'partial'
  | 'unavailable'
  | 'not_applicable';

export interface BranchOperationsHoursEvaluationDto {
  readonly status: BranchOperationsHoursStatusDto;
  readonly isOpen: boolean;
  readonly reasons: readonly string[];
}

export interface BranchOperationsCapacityEvaluationDto {
  readonly status: BranchOperationsCapacityStatusDto;
  readonly isAvailable: boolean;
  readonly activeOrders: number;
  readonly maxConcurrentOrders: number;
  readonly utilizationRatio: number;
  readonly reasons: readonly string[];
}

export interface BranchOperationsInventoryEvaluationDto {
  readonly status: BranchOperationsInventoryStatusDto;
  readonly isSufficient: boolean;
  readonly requestedCount: number;
  readonly unavailableCount: number;
  readonly missingItemIds: readonly string[];
  readonly reasons: readonly string[];
}

export interface BranchOperationsStatusEvaluationDto {
  readonly isActive: boolean;
  readonly status: BranchStatusValue;
  readonly reasons: readonly string[];
}

export interface BranchOperationsAvailabilityDto {
  readonly branchId: BranchId;
  readonly enabled: boolean;
  readonly isOperationallyAvailable: boolean;
  readonly blockers: readonly string[];
  readonly hours: BranchOperationsHoursEvaluationDto;
  readonly capacity: BranchOperationsCapacityEvaluationDto;
  readonly inventory: BranchOperationsInventoryEvaluationDto;
  readonly operationalStatus: BranchOperationsStatusEvaluationDto;
  readonly evaluatedAt: number;
  readonly capturedAt?: number;
}

export interface BranchOperationsAvailabilityQuery {
  readonly branchId: BranchId;
  readonly tenantId?: string;
  readonly branchName?: string;
  readonly branchStatus?: BranchStatusValue;
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly maxRadiusKm?: number;
  readonly cartItemIds?: readonly string[];
  readonly requireFullInventoryCoverage?: boolean;
  readonly evaluatedAt?: number;
  readonly correlationId?: string;
}
