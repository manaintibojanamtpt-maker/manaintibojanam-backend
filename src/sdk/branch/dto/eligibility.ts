/**
 * BranchSDK — eligibility DTOs (M5 PR-1 foundation).
 */

import type { BranchEligibilityStatus, BranchId } from '../types/branded';
import type { BranchScore } from './score';

export interface BranchEligibility {
  readonly branchId: BranchId;
  readonly isEligible: boolean;
  readonly status: BranchEligibilityStatus;
  readonly distanceKm: number;
  readonly maxRadiusKm: number;
  readonly reasons: readonly string[];
}

export interface BranchCandidate {
  readonly branchId: BranchId;
  readonly name: string;
  readonly distanceKm: number;
  readonly eligibility: BranchEligibility;
  readonly score?: BranchScore;
}
