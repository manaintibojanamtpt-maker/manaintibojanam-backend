/**
 * Branch domain — operational availability orchestration (M5 PR-10).
 * Pure domain — no assignment, scoring, SDK, or persistence.
 */

import { isOperationalStatusEligible } from '../eligibility/BranchEligibilityRules';
import { BRANCH_DOMAIN_ERROR_MESSAGES } from '../shared/BranchErrors';
import type { BranchOperationalSnapshot } from '../shared/BranchTypes';
import type {
  BranchAvailabilitySummary,
  BranchOperationsAvailabilityResult,
  BranchOperationsContext,
  BranchOperationalStatusEvaluation,
} from './BranchAvailabilitySummary';
import { createDisabledAvailabilitySummary } from './BranchAvailabilitySummary';
import { evaluateBranchCapacity } from './BranchCapacityEvaluator';
import { evaluateBranchHours } from './BranchHoursEvaluator';
import { evaluateBranchInventory } from './BranchInventoryEvaluator';
import {
  createBranchOperationsMetadata,
  isBranchOperationsEnabled,
  type BranchOperationsMetadata,
} from './BranchOperationsMetadata';

const evaluateOperationalStatus = (
  branch: BranchOperationalSnapshot
): BranchOperationalStatusEvaluation => {
  const reasons: string[] = [];
  const isActive = isOperationalStatusEligible(branch.status);

  if (!isActive) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_SUSPENDED);
  }

  return {
    isActive,
    status: branch.status,
    reasons,
  };
};

const collectBlockers = (
  operationalStatus: BranchOperationalStatusEvaluation,
  hours: BranchAvailabilitySummary['hours'],
  capacity: BranchAvailabilitySummary['capacity'],
  inventory: BranchAvailabilitySummary['inventory']
): readonly string[] => {
  const blockers: string[] = [];

  if (!operationalStatus.isActive) {
    blockers.push(...operationalStatus.reasons);
  }
  if (!hours.isOpen) {
    blockers.push(...hours.reasons);
  }
  if (!capacity.isAvailable) {
    blockers.push(...capacity.reasons);
  }
  if (!inventory.isSufficient) {
    blockers.push(...inventory.reasons);
  }

  return blockers;
};

export const evaluateBranchOperations = (
  branch: BranchOperationalSnapshot,
  context: BranchOperationsContext = {}
): BranchOperationsAvailabilityResult => {
  const evaluatedAt = context.evaluatedAt ?? 0;

  if (!isBranchOperationsEnabled(context.operationsEnabled)) {
    return {
      enabled: false,
      summary: createDisabledAvailabilitySummary(branch.branchId, evaluatedAt),
    };
  }

  const operationalStatus = evaluateOperationalStatus(branch);
  const hours = evaluateBranchHours(branch, {
    evaluatedAt,
    weeklyHours: context.weeklyHours,
  });
  const capacity = evaluateBranchCapacity(branch);
  const inventory = evaluateBranchInventory(branch, {
    cartItemIds: context.cartItemIds,
    requireFullInventoryCoverage: context.requireFullInventoryCoverage,
  });

  const blockers = collectBlockers(operationalStatus, hours, capacity, inventory);
  const isOperationallyAvailable =
    operationalStatus.isActive &&
    hours.isOpen &&
    capacity.isAvailable &&
    inventory.isSufficient;

  const summary: BranchAvailabilitySummary = {
    branchId: branch.branchId,
    isOperationallyAvailable,
    hours,
    capacity,
    inventory,
    operationalStatus,
    blockers,
    evaluatedAt,
  };

  return {
    enabled: true,
    summary,
  };
};

export const evaluateBranchOperationsMetadata = (
  branch: BranchOperationalSnapshot,
  context: BranchOperationsContext = {}
): BranchOperationsMetadata | null => {
  const result = evaluateBranchOperations(branch, context);
  if (!result.enabled) {
    return null;
  }

  return createBranchOperationsMetadata(result.summary);
};

export { evaluateBranchHours } from './BranchHoursEvaluator';
export { evaluateBranchCapacity, computeCapacityUtilization } from './BranchCapacityEvaluator';
export { evaluateBranchInventory, resolveMissingInventoryItemIds } from './BranchInventoryEvaluator';
export {
  createBranchOperationsMetadata,
  isBranchOperationsEnabled,
  BRANCH_OPERATIONS_FLAG,
  BRANCH_OPERATIONS_VERSION,
  BRANCH_OPERATIONS_ALGORITHM_VERSION,
} from './BranchOperationsMetadata';

export type {
  BranchAvailabilitySummary,
  BranchAvailabilitySummaryDisabled,
  BranchOperationsAvailabilityResult,
  BranchOperationsContext,
  BranchHoursEvaluation,
  BranchCapacityEvaluation,
  BranchInventoryEvaluation,
  BranchOperationalStatusEvaluation,
  BranchDayHours,
} from './BranchAvailabilitySummary';

export type { BranchOperationsMetadata } from './BranchOperationsMetadata';
