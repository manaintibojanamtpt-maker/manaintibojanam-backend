/**
 * Branch domain — inventory availability evaluation (M5 PR-10).
 */

import { DEFAULT_BRANCH_ASSIGNMENT_POLICY } from '../assignment/BranchAssignmentPolicy';
import { hasInventoryCoverage } from '../eligibility/BranchEligibilityRules';
import { BRANCH_DOMAIN_ERROR_MESSAGES } from '../shared/BranchErrors';
import type { BranchOperationalSnapshot } from '../shared/BranchTypes';
import type { BranchInventoryEvaluation } from './BranchAvailabilitySummary';

export const resolveMissingInventoryItemIds = (
  cartItemIds: readonly string[] | undefined,
  unavailableMenuItemIds: readonly string[] | undefined
): readonly string[] => {
  if (!cartItemIds || cartItemIds.length === 0) {
    return [];
  }

  const unavailable = new Set(unavailableMenuItemIds ?? []);
  return cartItemIds.filter((itemId) => unavailable.has(itemId));
};

export const evaluateBranchInventory = (
  branch: BranchOperationalSnapshot,
  options?: {
    readonly cartItemIds?: readonly string[];
    readonly requireFullInventoryCoverage?: boolean;
  }
): BranchInventoryEvaluation => {
  const reasons: string[] = [];
  const cartItemIds = options?.cartItemIds;
  const requestedCount = cartItemIds?.length ?? 0;
  const requireFull =
    options?.requireFullInventoryCoverage ??
    DEFAULT_BRANCH_ASSIGNMENT_POLICY.requireFullInventoryCoverage;
  const missingItemIds = resolveMissingInventoryItemIds(
    cartItemIds,
    branch.unavailableMenuItemIds
  );
  const unavailableCount = missingItemIds.length;

  if (requestedCount === 0) {
    return {
      status: 'not_applicable',
      isSufficient: true,
      requestedCount,
      unavailableCount: 0,
      missingItemIds: [],
      reasons,
    };
  }

  if (unavailableCount === 0) {
    return {
      status: 'complete',
      isSufficient: true,
      requestedCount,
      unavailableCount,
      missingItemIds,
      reasons,
    };
  }

  const isSufficient = hasInventoryCoverage(
    cartItemIds,
    branch.unavailableMenuItemIds,
    requireFull
  );

  if (!isSufficient && unavailableCount >= requestedCount) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.INVENTORY_SHORT);
    return {
      status: 'unavailable',
      isSufficient: false,
      requestedCount,
      unavailableCount,
      missingItemIds,
      reasons,
    };
  }

  if (!isSufficient) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.INVENTORY_SHORT);
    return {
      status: requireFull ? 'unavailable' : 'partial',
      isSufficient: false,
      requestedCount,
      unavailableCount,
      missingItemIds,
      reasons,
    };
  }

  return {
    status: 'partial',
    isSufficient: true,
    requestedCount,
    unavailableCount,
    missingItemIds,
    reasons,
  };
};
