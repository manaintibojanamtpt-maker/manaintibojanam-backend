/**
 * BranchSDK — public contract (interface only; M5 PR-1).
 * ADR-015: Only BranchSDK may choose fulfillment branches.
 *
 * No Firestore, REST, or UI in this contract.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type {
  BranchAssignment,
  BranchAssignmentRequest,
  BranchCandidate,
  BranchDetail,
  BranchEligibilityQuery,
  BranchETAInput,
  BranchETAEstimate,
  BranchListFilter,
  BranchOverrideRequest,
  BranchSelectionQuery,
  BranchSummary,
  BranchValidationInput,
  BranchValidationResult,
} from '../dto';
import type { BranchId } from '../types/branded';
import type { CreateBranchSDKOptions } from '../shared/options';

/**
 * Public branch SDK surface for presentation layer.
 * Implementations arrive in M5 PR-2+ adapters — not in foundation PR.
 */
export interface BranchSDK {
  /** Select the best fulfillment branch for a brand + customer context. */
  findBestBranch(query: BranchSelectionQuery): SdkAsyncResult<BranchAssignment>;

  /** List branches passing eligibility gates (override picker, pickup). */
  findEligibleBranches(query: BranchEligibilityQuery): SdkAsyncResult<BranchCandidate[]>;

  /** Persist an assignment decision (draft order / session). */
  assignBranch(request: BranchAssignmentRequest): SdkAsyncResult<BranchAssignment>;

  /** Customer or owner manual override — re-validates eligibility. */
  overrideAssignment(request: BranchOverrideRequest): SdkAsyncResult<BranchAssignment>;

  /** ETA from branch point + capacity signals. */
  estimateETA(input: BranchETAInput): SdkAsyncResult<BranchETAEstimate>;

  /** Branch detail card. */
  getBranch(branchId: BranchId): SdkAsyncResult<BranchDetail>;

  /** List branches for a brand (owner / admin scope). */
  listBranches(filter: BranchListFilter): SdkAsyncResult<BranchSummary[]>;

  /** Validate branch still serviceable for cart + customer point. */
  validateBranch(input: BranchValidationInput): SdkResult<BranchValidationResult>;
}

export interface BranchSDKFactory {
  create(options?: CreateBranchSDKOptions): BranchSDK;
}
