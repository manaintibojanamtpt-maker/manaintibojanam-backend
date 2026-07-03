/**
 * BranchSDK — assignment policy resolution (M5 PR-7).
 */

import {
  DEFAULT_BRANCH_ASSIGNMENT_POLICY,
  meetsMinimumScoreThreshold,
  resolvePreferredAssignmentReason,
  type BranchAssignmentPolicy,
} from '../../../domain/branch/assignment/BranchAssignmentPolicy';
import type { BranchOrderType } from '../../../domain/branch/shared/BranchTypes';
import type { BranchRoutingPolicy } from '../dto/routing';
import type { BranchSelectionQuery } from '../dto/queries';
import type { BranchId } from '../types/branded';

export const mapRoutingPolicyToAssignmentPolicy = (
  routing?: BranchRoutingPolicy
): BranchAssignmentPolicy => {
  if (!routing) {
    return DEFAULT_BRANCH_ASSIGNMENT_POLICY;
  }

  return {
    ...DEFAULT_BRANCH_ASSIGNMENT_POLICY,
    autoSelectEnabled: routing.autoSelectEnabled,
    failover: {
      enabled: routing.failoverPolicy.enabled,
      maxAttempts: routing.failoverPolicy.maxAttempts,
      preferSameZone: routing.failoverPolicy.preferSameZone,
    },
  };
};

export const resolveAssignmentPolicy = (
  routing?: BranchRoutingPolicy
): BranchAssignmentPolicy => mapRoutingPolicyToAssignmentPolicy(routing);

export const resolveAssignmentReason = (
  orderType: BranchOrderType,
  policy: BranchAssignmentPolicy = DEFAULT_BRANCH_ASSIGNMENT_POLICY
) => resolvePreferredAssignmentReason(orderType, policy);

export const passesAssignmentScoreThreshold = (
  score: number,
  policy: BranchAssignmentPolicy = DEFAULT_BRANCH_ASSIGNMENT_POLICY
): boolean => meetsMinimumScoreThreshold(score, policy);

export const filterExcludedBranchIds = (
  branchIds: readonly BranchId[],
  query: BranchSelectionQuery
): BranchId[] => {
  const excluded = new Set((query.excludeBranchIds ?? []).map(String));
  return branchIds.filter((branchId) => !excluded.has(String(branchId)));
};

export const shouldPreferBranch = (
  branchId: BranchId,
  query: BranchSelectionQuery
): boolean =>
  Boolean(query.preferredBranchId && String(query.preferredBranchId) === String(branchId));
