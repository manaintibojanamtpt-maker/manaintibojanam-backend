/**
 * BranchSDK — stub adapter (M5 PR-1).
 * All methods return NOT_CONFIGURED until pipeline PR lands.
 */

import type { SdkAsyncResult, SdkResult } from '../../core/result';
import type { BranchSDK } from '../contracts/BranchSDK';
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
import {
  branchNotConfiguredAsync,
  branchNotConfiguredSync,
} from './notConfigured';

const LAYER = 'StubBranchAdapter';

export class StubBranchAdapter implements BranchSDK {
  findBestBranch(_query: BranchSelectionQuery): SdkAsyncResult<BranchAssignment> {
    return branchNotConfiguredAsync('findBestBranch', LAYER);
  }

  findEligibleBranches(_query: BranchEligibilityQuery): SdkAsyncResult<BranchCandidate[]> {
    return branchNotConfiguredAsync('findEligibleBranches', LAYER);
  }

  assignBranch(_request: BranchAssignmentRequest): SdkAsyncResult<BranchAssignment> {
    return branchNotConfiguredAsync('assignBranch', LAYER);
  }

  overrideAssignment(_request: BranchOverrideRequest): SdkAsyncResult<BranchAssignment> {
    return branchNotConfiguredAsync('overrideAssignment', LAYER);
  }

  estimateETA(_input: BranchETAInput): SdkAsyncResult<BranchETAEstimate> {
    return branchNotConfiguredAsync('estimateETA', LAYER);
  }

  getBranch(_branchId: BranchId): SdkAsyncResult<BranchDetail> {
    return branchNotConfiguredAsync('getBranch', LAYER);
  }

  listBranches(_filter: BranchListFilter): SdkAsyncResult<BranchSummary[]> {
    return branchNotConfiguredAsync('listBranches', LAYER);
  }

  validateBranch(_input: BranchValidationInput): SdkResult<BranchValidationResult> {
    return branchNotConfiguredSync('validateBranch', LAYER);
  }
}

export function createStubBranchAdapter(): BranchSDK {
  return new StubBranchAdapter();
}
