/**
 * Branch domain — assignment reason taxonomy (M5 PR-2).
 */

export type BranchAssignmentReason =
  | 'nearest_serviceable'
  | 'lowest_eta'
  | 'capacity_failover'
  | 'inventory_failover'
  | 'customer_override'
  | 'owner_override'
  | 'pickup_selected'
  | 'default_branch';

export const BRANCH_ASSIGNMENT_REASONS: readonly BranchAssignmentReason[] = [
  'nearest_serviceable',
  'lowest_eta',
  'capacity_failover',
  'inventory_failover',
  'customer_override',
  'owner_override',
  'pickup_selected',
  'default_branch',
] as const;

export const OVERRIDE_ASSIGNMENT_REASONS: readonly BranchAssignmentReason[] = [
  'customer_override',
  'owner_override',
  'pickup_selected',
] as const;

export const isOverrideAssignmentReason = (reason: BranchAssignmentReason): boolean =>
  OVERRIDE_ASSIGNMENT_REASONS.includes(reason);

export const isAutomaticAssignmentReason = (reason: BranchAssignmentReason): boolean =>
  !isOverrideAssignmentReason(reason);
