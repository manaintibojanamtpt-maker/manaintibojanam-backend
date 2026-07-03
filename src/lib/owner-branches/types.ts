/**
 * M5 PR-13 — Owner branch presentation types.
 */

import type { BranchOperationsAvailabilityDto } from '../../sdk/branch/dto/operations';
import type {
  BranchDetail,
  BranchETAEstimate,
  BranchSummary,
  BranchValidationResult,
} from '../../sdk/branch/dto';
import type { BranchId } from '../../sdk/branch/types/branded';
import type { TenantId } from '../../sdk/core/types';
import type {
  BranchEtaFacadeQuery,
  BranchGetFacadeQuery,
  BranchListFacadeQuery,
  BranchOperationsAvailabilityFacadeQuery,
  BranchValidateFacadeQuery,
} from '../branch/types';

export type OwnerBranchSessionStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'empty'
  | 'error'
  | 'disabled'
  | 'retry'
  | 'cancelled';

export type OwnerBranchFacadeOperation =
  | 'listBranches'
  | 'getBranch'
  | 'getOperationalAvailability'
  | 'validateBranch'
  | 'estimateETA';

export type OwnerBranchFacadeRequest =
  | { readonly operation: 'listBranches'; readonly query: OwnerBranchListQuery }
  | { readonly operation: 'getBranch'; readonly query: OwnerBranchGetQuery }
  | {
      readonly operation: 'getOperationalAvailability';
      readonly query: OwnerBranchOperationalAvailabilityQuery;
    }
  | { readonly operation: 'validateBranch'; readonly query: OwnerBranchValidateQuery }
  | { readonly operation: 'estimateETA'; readonly query: OwnerBranchEtaQuery };

export interface OwnerBranchListQuery {
  readonly tenantId: TenantId;
  readonly includeInactive?: boolean;
  readonly limit?: number;
}

export interface OwnerBranchGetQuery {
  readonly branchId: BranchId;
}

export interface OwnerBranchOperationalAvailabilityQuery {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly branchName?: string;
  readonly cartItemIds?: readonly string[];
  readonly evaluatedAt?: number;
  readonly correlationId?: string;
}

export interface OwnerBranchValidateQuery {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly orderType: BranchValidateFacadeQuery['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly cartItemIds?: readonly string[];
}

export interface OwnerBranchEtaQuery {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly orderType: BranchEtaFacadeQuery['orderType'];
  readonly customerPoint?: {
    readonly lat: number;
    readonly lng: number;
  };
}

export interface OwnerBranchPresentationError {
  readonly code: string;
  readonly message: string;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly featureDisabled?: boolean;
}

export type OwnerBranchListOutcome =
  | { readonly ok: true; readonly branches: readonly BranchSummary[] }
  | { readonly ok: false; readonly error: OwnerBranchPresentationError };

export type OwnerBranchGetOutcome =
  | { readonly ok: true; readonly branch: BranchDetail }
  | { readonly ok: false; readonly error: OwnerBranchPresentationError };

export type OwnerBranchOperationalAvailabilityOutcome =
  | { readonly ok: true; readonly availability: BranchOperationsAvailabilityDto }
  | { readonly ok: false; readonly error: OwnerBranchPresentationError };

export type OwnerBranchValidateOutcome =
  | { readonly ok: true; readonly validation: BranchValidationResult }
  | { readonly ok: false; readonly error: OwnerBranchPresentationError };

export type OwnerBranchEtaOutcome =
  | { readonly ok: true; readonly estimate: BranchETAEstimate }
  | { readonly ok: false; readonly error: OwnerBranchPresentationError };

export interface OwnerBranchSessionSnapshot {
  readonly status: OwnerBranchSessionStatus;
  readonly lastOperation: OwnerBranchFacadeOperation | null;
  readonly lastRequest: OwnerBranchFacadeRequest | null;
  readonly lastError: OwnerBranchPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
  readonly telemetryId: string | null;
}

export const EMPTY_OWNER_BRANCH_SESSION: OwnerBranchSessionSnapshot = {
  status: 'idle',
  lastOperation: null,
  lastRequest: null,
  lastError: null,
  retryCount: 0,
  lastAttemptAt: null,
  telemetryId: null,
};

export type OwnerBranchListFacadeQuery = BranchListFacadeQuery;
export type OwnerBranchGetFacadeQuery = BranchGetFacadeQuery;
export type OwnerBranchOperationsAvailabilityFacadeQuery = BranchOperationsAvailabilityFacadeQuery;
