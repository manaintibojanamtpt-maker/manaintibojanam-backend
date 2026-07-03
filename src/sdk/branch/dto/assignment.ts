/**
 * BranchSDK — assignment DTOs (M5 PR-1 foundation).
 */

import type { TenantId } from '../../core/types';
import type { BranchAssignmentId, BranchId } from '../types/branded';
import type { BranchEligibility } from './eligibility';
import type { BranchETAEstimate } from './eta';
import type { BranchAssignmentReason } from './queries';
import type { BranchScore } from './score';

export interface BranchAssignment {
  readonly assignmentId: BranchAssignmentId;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly reason: BranchAssignmentReason;
  readonly score?: BranchScore;
  readonly eligibility: BranchEligibility;
  readonly eta?: BranchETAEstimate;
  readonly deliveryFee?: number;
  readonly assignedAt: number;
  readonly expiresAt?: number;
  readonly overrideApplied: boolean;
}

export interface BranchValidationResult {
  readonly branchId: BranchId;
  readonly isValid: boolean;
  readonly eligibility: BranchEligibility;
  readonly issues: readonly string[];
}
