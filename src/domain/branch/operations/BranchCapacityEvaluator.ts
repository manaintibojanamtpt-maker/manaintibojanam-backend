/**
 * Branch domain — capacity evaluation (M5 PR-10).
 */

import { BRANCH_DOMAIN_ERROR_MESSAGES } from '../shared/BranchErrors';
import type { BranchOperationalSnapshot } from '../shared/BranchTypes';
import { isCongestionBlocking } from '../eligibility/BranchEligibilityRules';
import type { BranchCapacityEvaluation } from './BranchAvailabilitySummary';

const CAPACITY_LIMITED_UTILIZATION = 0.8;

export const computeCapacityUtilization = (
  activeOrders: number,
  maxConcurrentOrders: number
): number => {
  if (!Number.isFinite(activeOrders) || activeOrders < 0) {
    return 0;
  }
  if (!Number.isFinite(maxConcurrentOrders) || maxConcurrentOrders <= 0) {
    return 0;
  }
  return Math.min(1, activeOrders / maxConcurrentOrders);
};

export const evaluateBranchCapacity = (
  branch: BranchOperationalSnapshot
): BranchCapacityEvaluation => {
  const reasons: string[] = [];
  const activeOrders = branch.activeOrders ?? 0;
  const maxConcurrentOrders = branch.maxConcurrentOrders ?? 0;
  const utilizationRatio = computeCapacityUtilization(activeOrders, maxConcurrentOrders);

  if (!branch.acceptingOrders) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_BUSY);
    return {
      status: 'full',
      isAvailable: false,
      activeOrders,
      maxConcurrentOrders,
      utilizationRatio,
      reasons,
    };
  }

  if (
    maxConcurrentOrders > 0 &&
    activeOrders >= maxConcurrentOrders
  ) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_BUSY);
    return {
      status: 'full',
      isAvailable: false,
      activeOrders,
      maxConcurrentOrders,
      utilizationRatio,
      reasons,
    };
  }

  if (isCongestionBlocking(branch.congestionLevel)) {
    reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_BUSY);
    return {
      status: 'full',
      isAvailable: false,
      activeOrders,
      maxConcurrentOrders,
      utilizationRatio,
      reasons,
    };
  }

  if (
    branch.isBusy ||
    branch.congestionLevel === 'high' ||
    branch.congestionLevel === 'medium' ||
    utilizationRatio >= CAPACITY_LIMITED_UTILIZATION
  ) {
    if (branch.isBusy) {
      reasons.push(BRANCH_DOMAIN_ERROR_MESSAGES.BRANCH_BUSY);
    }
    return {
      status: 'limited',
      isAvailable: true,
      activeOrders,
      maxConcurrentOrders,
      utilizationRatio,
      reasons,
    };
  }

  return {
    status: 'available',
    isAvailable: true,
    activeOrders,
    maxConcurrentOrders,
    utilizationRatio,
    reasons,
  };
};
