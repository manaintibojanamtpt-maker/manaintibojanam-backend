/**
 * M5 PR-5 — Branch presentation types.
 */

import type {
  BranchAssignment,
  BranchCandidate,
  BranchDetail,
  BranchETAEstimate,
  BranchListFilter,
  BranchSummary,
  BranchValidationResult,
} from '../../sdk/branch/dto';
import type {
  BranchEligibilityQuery,
  BranchETAInput,
  BranchSelectionQuery,
  BranchValidationInput,
} from '../../sdk/branch/dto';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { BranchOperationsAvailabilityDto } from '../../sdk/branch/dto/operations';

export type BranchSessionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'disabled'
  | 'retry'
  | 'cancelled';

export type BranchFacadeOperation =
  | 'listBranches'
  | 'getBranch'
  | 'findEligibleBranches'
  | 'validateBranch'
  | 'estimateETA'
  | 'findBestBranch'
  | 'getOperationalAvailability';

export interface BranchListFacadeQuery {
  readonly tenantId: TenantId;
  readonly status?: BranchListFilter['status'];
  readonly includeInactive?: boolean;
  readonly limit?: number;
}

export interface BranchGetFacadeQuery {
  readonly branchId: BranchId;
}

export interface BranchEligibilityFacadeQuery {
  readonly tenantId: TenantId;
  readonly orderType: BranchEligibilityQuery['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly includeClosed?: boolean;
  readonly limit?: number;
}

export interface BranchValidateFacadeQuery {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly orderType: BranchValidationInput['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly cartItemIds?: readonly string[];
}

export interface BranchEtaFacadeQuery {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly orderType: BranchETAInput['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
}

export interface BranchSelectionFacadeQuery {
  readonly tenantId: TenantId;
  readonly orderType: BranchSelectionQuery['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly cartItemIds?: readonly string[];
  readonly preferredBranchId?: BranchId;
  readonly excludeBranchIds?: readonly BranchId[];
  readonly correlationId?: string;
}

export interface BranchOperationsAvailabilityFacadeQuery {
  readonly branchId: BranchId;
  readonly tenantId?: TenantId;
  readonly branchName?: string;
  readonly branchStatus?: BranchListFilter['status'];
  readonly cartItemIds?: readonly string[];
  readonly evaluatedAt?: number;
  readonly correlationId?: string;
}

export type BranchFacadeRequest =
  | { readonly operation: 'listBranches'; readonly query: BranchListFacadeQuery }
  | { readonly operation: 'getBranch'; readonly query: BranchGetFacadeQuery }
  | { readonly operation: 'findEligibleBranches'; readonly query: BranchEligibilityFacadeQuery }
  | { readonly operation: 'validateBranch'; readonly query: BranchValidateFacadeQuery }
  | { readonly operation: 'estimateETA'; readonly query: BranchEtaFacadeQuery }
  | { readonly operation: 'findBestBranch'; readonly query: BranchSelectionFacadeQuery }
  | {
      readonly operation: 'getOperationalAvailability';
      readonly query: BranchOperationsAvailabilityFacadeQuery;
    };

export interface BranchPresentationError {
  readonly code: string;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export type BranchListFacadeOutcome =
  | { readonly ok: true; readonly branches: readonly BranchSummary[] }
  | { readonly ok: false; readonly error: BranchPresentationError };

export type BranchGetFacadeOutcome =
  | { readonly ok: true; readonly branch: BranchDetail }
  | { readonly ok: false; readonly error: BranchPresentationError };

export type BranchEligibleFacadeOutcome =
  | { readonly ok: true; readonly candidates: readonly BranchCandidate[] }
  | { readonly ok: false; readonly error: BranchPresentationError };

export type BranchValidateFacadeOutcome =
  | { readonly ok: true; readonly validation: BranchValidationResult }
  | { readonly ok: false; readonly error: BranchPresentationError };

export type BranchEtaFacadeOutcome =
  | { readonly ok: true; readonly estimate: BranchETAEstimate }
  | { readonly ok: false; readonly error: BranchPresentationError };

export type BranchAssignmentFacadeOutcome =
  | { readonly ok: true; readonly assignment: BranchAssignment }
  | { readonly ok: false; readonly error: BranchPresentationError };

export type BranchOperationsAvailabilityFacadeOutcome =
  | { readonly ok: true; readonly availability: BranchOperationsAvailabilityDto }
  | { readonly ok: false; readonly error: BranchPresentationError };

export interface BranchSessionSnapshot {
  readonly status: BranchSessionStatus;
  readonly lastOperation: BranchFacadeOperation | null;
  readonly lastRequest: BranchFacadeRequest | null;
  readonly lastError: BranchPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
  readonly telemetryId: string | null;
}

export const EMPTY_BRANCH_SESSION: BranchSessionSnapshot = {
  status: 'idle',
  lastOperation: null,
  lastRequest: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
  telemetryId: null,
};

export interface BranchTelemetrySnapshot {
  readonly attemptId: string;
  readonly operation: BranchFacadeOperation | null;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly status: BranchSessionStatus;
  readonly contextMs: number | null;
  readonly sdkMs: number | null;
  readonly totalMs: number | null;
}

export const EMPTY_BRANCH_TELEMETRY: BranchTelemetrySnapshot = {
  attemptId: '',
  operation: null,
  startedAt: 0,
  completedAt: null,
  status: 'idle',
  contextMs: null,
  sdkMs: null,
  totalMs: null,
};

export type BranchPresentationTelemetryEvent =
  | {
      readonly type: 'request';
      readonly operation: BranchFacadeOperation;
      readonly attemptId: string;
      readonly tenantId?: string;
      readonly branchId?: string;
    }
  | {
      readonly type: 'success';
      readonly operation: BranchFacadeOperation;
      readonly attemptId: string;
      readonly timingMs?: number;
    }
  | {
      readonly type: 'failure';
      readonly operation: BranchFacadeOperation;
      readonly attemptId: string;
      readonly errorCode: string;
      readonly timingMs?: number;
    }
  | {
      readonly type: 'retry';
      readonly operation: BranchFacadeOperation;
      readonly attemptId: string;
      readonly retryCount: number;
    }
  | {
      readonly type: 'cancel';
      readonly operation: BranchFacadeOperation | null;
      readonly attemptId: string;
    };

export type BranchPresentationTelemetryHook = (event: BranchPresentationTelemetryEvent) => void;
