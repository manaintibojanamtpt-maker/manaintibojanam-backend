/**
 * Branch domain — assignment policy (M5 PR-2).
 * Pure policy structures — no persistence or side effects.
 */

import { BRANCH_TIE_BREAK_STRATEGY, type BranchTieBreakStrategy } from '../shared/BranchConstants';
import type { BranchOrderType } from '../shared/BranchTypes';
import type { BranchAssignmentReason } from './BranchAssignmentReason';

export interface BranchFailoverPolicy {
  readonly enabled: boolean;
  readonly maxAttempts: number;
  readonly preferSameZone: boolean;
}

export interface BranchAssignmentPolicy {
  readonly autoSelectEnabled: boolean;
  readonly minScoreThreshold: number;
  readonly requireFullInventoryCoverage: boolean;
  readonly tieBreakStrategy: BranchTieBreakStrategy;
  readonly failover: BranchFailoverPolicy;
  readonly preferredReasonByOrderType: Readonly<Record<BranchOrderType, BranchAssignmentReason>>;
}

export const DEFAULT_BRANCH_FAILOVER_POLICY: BranchFailoverPolicy = {
  enabled: true,
  maxAttempts: 3,
  preferSameZone: true,
};

export const DEFAULT_BRANCH_ASSIGNMENT_POLICY: BranchAssignmentPolicy = {
  autoSelectEnabled: true,
  minScoreThreshold: 0.1,
  requireFullInventoryCoverage: true,
  tieBreakStrategy: BRANCH_TIE_BREAK_STRATEGY,
  failover: DEFAULT_BRANCH_FAILOVER_POLICY,
  preferredReasonByOrderType: {
    delivery: 'nearest_serviceable',
    pickup: 'pickup_selected',
  },
};

export const resolvePreferredAssignmentReason = (
  orderType: BranchOrderType,
  policy: BranchAssignmentPolicy = DEFAULT_BRANCH_ASSIGNMENT_POLICY
): BranchAssignmentReason => policy.preferredReasonByOrderType[orderType];

export const shouldAttemptFailover = (
  attemptIndex: number,
  policy: BranchAssignmentPolicy = DEFAULT_BRANCH_ASSIGNMENT_POLICY
): boolean => policy.failover.enabled && attemptIndex < policy.failover.maxAttempts;

export const meetsMinimumScoreThreshold = (
  score: number,
  policy: BranchAssignmentPolicy = DEFAULT_BRANCH_ASSIGNMENT_POLICY
): boolean => score >= policy.minScoreThreshold;
