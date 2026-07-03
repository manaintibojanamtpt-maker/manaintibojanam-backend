/**
 * BranchSDK — default adapter (M5 PR-4).
 * Orchestrates repository reads and domain evaluation — no assignment or scoring.
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
import type { BranchRepository } from '../repository/BranchRepository';
import {
  branchNotConfiguredAsync,
  branchNotConfiguredSync,
} from './notConfigured';
import type { BranchTelemetryHook } from './BranchTelemetry';
import type { DefaultBranchAssignmentEngine } from '../assignment/DefaultBranchAssignmentEngine';
import {
  orchestrateEstimateETA,
  orchestrateFindEligibleBranches,
  orchestrateGetBranch,
  orchestrateListBranches,
  orchestrateValidateBranch,
  type BranchSdkOrchestratorDeps,
} from './BranchSdkOrchestrator';

import {
  assignmentNotConfiguredAsync,
  resolveBranchAssignmentEnabled,
} from '../assignment/createBranchAssignmentEngine';

const LAYER = 'DefaultBranchAdapter';

export interface DefaultBranchAdapterDeps {
  readonly repository: BranchRepository;
  readonly repositoryEnabled: boolean;
  readonly assignmentEngine?: DefaultBranchAssignmentEngine | null;
  readonly assignmentEnabled?: boolean;
  readonly onTelemetry?: BranchTelemetryHook;
  readonly syncSnapshotResolver?: BranchSdkOrchestratorDeps['syncSnapshotResolver'];
}

export class DefaultBranchAdapter implements BranchSDK {
  private readonly orchestratorDeps: BranchSdkOrchestratorDeps;
  private readonly assignmentEngine: DefaultBranchAssignmentEngine | null;
  private readonly assignmentEnabled: boolean;

  constructor(deps: DefaultBranchAdapterDeps) {
    this.orchestratorDeps = {
      repository: deps.repository,
      repositoryEnabled: deps.repositoryEnabled,
      onTelemetry: deps.onTelemetry,
      syncSnapshotResolver: deps.syncSnapshotResolver,
    };
    this.assignmentEngine = deps.assignmentEngine ?? null;
    this.assignmentEnabled = deps.assignmentEnabled ?? false;
  }

  async findBestBranch(query: BranchSelectionQuery): SdkAsyncResult<BranchAssignment> {
    if (!this.assignmentEnabled || !this.assignmentEngine) {
      return assignmentNotConfiguredAsync();
    }

    const result = await this.assignmentEngine.assignBestBranch({ query });
    if (!result.ok) {
      return result;
    }

    return { ok: true, value: result.value.assignment };
  }

  findEligibleBranches(query: BranchEligibilityQuery): SdkAsyncResult<BranchCandidate[]> {
    return orchestrateFindEligibleBranches(this.orchestratorDeps, query);
  }

  assignBranch(_request: BranchAssignmentRequest): SdkAsyncResult<BranchAssignment> {
    return branchNotConfiguredAsync('assignBranch', LAYER);
  }

  overrideAssignment(_request: BranchOverrideRequest): SdkAsyncResult<BranchAssignment> {
    return branchNotConfiguredAsync('overrideAssignment', LAYER);
  }

  estimateETA(input: BranchETAInput): SdkAsyncResult<BranchETAEstimate> {
    return orchestrateEstimateETA(this.orchestratorDeps, input);
  }

  getBranch(branchId: BranchId): SdkAsyncResult<BranchDetail> {
    return orchestrateGetBranch(this.orchestratorDeps, branchId);
  }

  listBranches(filter: BranchListFilter): SdkAsyncResult<BranchSummary[]> {
    return orchestrateListBranches(this.orchestratorDeps, filter);
  }

  validateBranch(input: BranchValidationInput): SdkResult<BranchValidationResult> {
    return orchestrateValidateBranch(this.orchestratorDeps, input);
  }
}

export const createDefaultBranchAdapter = (deps: DefaultBranchAdapterDeps): BranchSDK =>
  new DefaultBranchAdapter(deps);
