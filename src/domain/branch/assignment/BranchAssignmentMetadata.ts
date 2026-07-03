/**
 * Branch domain — assignment metadata builders (M5 PR-2).
 */

import type { BranchAssignmentReason } from './BranchAssignmentReason';
import type { BranchEligibilityResult, BranchId, BranchScoreBreakdown, TenantId } from '../shared/BranchTypes';

export interface BranchAssignmentMetadata {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly reason: BranchAssignmentReason;
  readonly score: BranchScoreBreakdown;
  readonly eligibility: BranchEligibilityResult;
  readonly assignedAt: number;
  readonly correlationId?: string;
  readonly overrideApplied: boolean;
  readonly policyVersion: string;
}

export interface CreateBranchAssignmentMetadataInput {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly reason: BranchAssignmentReason;
  readonly score: BranchScoreBreakdown;
  readonly eligibility: BranchEligibilityResult;
  readonly correlationId?: string;
  readonly overrideApplied?: boolean;
  readonly assignedAt?: number;
  readonly policyVersion?: string;
}

export const BRANCH_ASSIGNMENT_METADATA_VERSION = '0.1.0-foundation' as const;

export const createBranchAssignmentMetadata = (
  input: CreateBranchAssignmentMetadataInput
): BranchAssignmentMetadata => ({
  tenantId: input.tenantId,
  branchId: input.branchId,
  branchName: input.branchName,
  reason: input.reason,
  score: input.score,
  eligibility: input.eligibility,
  correlationId: input.correlationId,
  overrideApplied: input.overrideApplied ?? false,
  assignedAt: input.assignedAt ?? 0,
  policyVersion: input.policyVersion ?? BRANCH_ASSIGNMENT_METADATA_VERSION,
});

export const withAssignmentTimestamp = (
  metadata: BranchAssignmentMetadata,
  assignedAt: number
): BranchAssignmentMetadata => ({
  ...metadata,
  assignedAt,
});
