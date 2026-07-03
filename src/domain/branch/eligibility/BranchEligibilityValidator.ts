/**
 * Branch domain — eligibility validator (M5 PR-2).
 */

import { DEFAULT_BRANCH_ASSIGNMENT_POLICY } from '../assignment/BranchAssignmentPolicy';
import { BRANCH_DOMAIN_ERROR_MESSAGES } from '../shared/BranchErrors';
import type {
  BranchEligibilityResult,
  BranchEligibilityStatus,
  BranchOperationalSnapshot,
  BranchOrderType,
} from '../shared/BranchTypes';
import {
  hasInventoryCoverage,
  isCongestionBlocking,
  isOperationalStatusEligible,
  isWithinRadius,
} from './BranchEligibilityRules';

export interface BranchEligibilityContext {
  readonly orderType: BranchOrderType;
  readonly cartItemIds?: readonly string[];
  readonly requireFullInventoryCoverage?: boolean;
}

export const evaluateBranchEligibility = (
  branch: BranchOperationalSnapshot,
  context: BranchEligibilityContext
): BranchEligibilityResult => {
  const reasons: string[] = [];
  const maxRadiusKm = branch.deliveryZone.maxRadiusKm;
  const requireInventory =
    context.requireFullInventoryCoverage ??
    DEFAULT_BRANCH_ASSIGNMENT_POLICY.requireFullInventoryCoverage;

  if (!isOperationalStatusEligible(branch.status)) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_SUSPENDED);
    return buildEligibilityResult(branch, false, 'suspended', reasons);
  }

  if (context.orderType === 'delivery' && !isWithinRadius(branch.distanceKm, maxRadiusKm)) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.OUT_OF_RADIUS);
    return buildEligibilityResult(branch, false, 'out_of_radius', reasons);
  }

  if (!branch.isOpen) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_CLOSED);
    return buildEligibilityResult(branch, false, 'closed', reasons);
  }

  if (!branch.acceptingOrders || branch.isBusy || isCongestionBlocking(branch.congestionLevel)) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_BUSY);
    return buildEligibilityResult(branch, false, 'busy', reasons);
  }

  if (!hasInventoryCoverage(context.cartItemIds, branch.unavailableMenuItemIds, requireInventory)) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.INVENTORY_SHORT);
    return buildEligibilityResult(branch, false, 'inventory_short', reasons);
  }

  return buildEligibilityResult(branch, true, 'serviceable', reasons);
};

const buildEligibilityResult = (
  branch: BranchOperationalSnapshot,
  isEligible: boolean,
  status: BranchEligibilityStatus,
  reasons: string[]
): BranchEligibilityResult => ({
  branchId: branch.branchId,
  isEligible,
  status,
  distanceKm: branch.distanceKm,
  maxRadiusKm: branch.deliveryZone.maxRadiusKm,
  reasons,
});

export const filterEligibleBranches = (
  branches: readonly BranchOperationalSnapshot[],
  context: BranchEligibilityContext
): BranchEligibilityResult[] =>
  branches
    .map((branch) => evaluateBranchEligibility(branch, context))
    .filter((result) => result.isEligible);
