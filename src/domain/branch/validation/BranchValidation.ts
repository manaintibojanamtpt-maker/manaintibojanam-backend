/**
 * Branch domain — selection query and branch validation (M5 PR-2).
 */

import { BRANCH_DOMAIN_ERROR_CODES, BRANCH_DOMAIN_ERROR_MESSAGES, branchDomainFail, branchDomainOk, type BranchDomainResult } from '../shared/BranchErrors';
import type {
  BranchOperationalSnapshot,
  BranchSelectionQuery,
  BranchValidationResult,
} from '../shared/BranchTypes';
import { evaluateBranchEligibility, type BranchEligibilityContext } from '../eligibility/BranchEligibilityValidator';
import { calculateBranchScore } from '../scoring/BranchScoreCalculator';
import { validateBranchScoreWeights } from '../scoring/BranchScoreWeights';

const isValidPoint = (point: GeoPoint | undefined): point is GeoPoint =>
  Boolean(
    point &&
      Number.isFinite(point.lat) &&
      Number.isFinite(point.lng) &&
      point.lat !== 0 &&
      point.lng !== 0
  );

interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export const validateBranchSelectionQuery = (
  query: BranchSelectionQuery
): BranchDomainResult<BranchSelectionQuery> => {
  const tenantId = query.tenantId?.trim();
  if (!tenantId) {
    return branchDomainFail(
      BRANCH_DOMAIN_ERROR_CODES.INVALID_QUERY,
      BRANCH_DOMAIN_ERROR_MESSAGES.MISSING_TENANT,
      'tenantId'
    );
  }

  if (!isValidPoint(query.customerPoint)) {
    return branchDomainFail(
      BRANCH_DOMAIN_ERROR_CODES.INVALID_QUERY,
      BRANCH_DOMAIN_ERROR_MESSAGES.MISSING_CUSTOMER_POINT,
      'customerPoint'
    );
  }

  if (query.orderType !== 'delivery' && query.orderType !== 'pickup') {
    return branchDomainFail(
      BRANCH_DOMAIN_ERROR_CODES.INVALID_QUERY,
      BRANCH_DOMAIN_ERROR_MESSAGES.INVALID_ORDER_TYPE,
      'orderType'
    );
  }

  return branchDomainOk(query);
};

export const validateBranchDomainWeights = (): BranchDomainResult<true> => {
  if (!validateBranchScoreWeights()) {
    return branchDomainFail(
      BRANCH_DOMAIN_ERROR_CODES.INVALID_WEIGHTS,
      BRANCH_DOMAIN_ERROR_MESSAGES.INVALID_WEIGHTS
    );
  }

  return branchDomainOk(true);
};

export const validateBranchForAssignment = (
  branch: BranchOperationalSnapshot,
  context: BranchEligibilityContext
): BranchValidationResult => {
  const eligibility = evaluateBranchEligibility(branch, context);

  const issues: string[] = [...eligibility.reasons];
  if (!eligibility.isEligible) {
    issues.push(BRANCH_DOMAIN_ERROR_MESSAGES.VALIDATION_FAILED);
  }

  return {
    branchId: branch.branchId,
    isValid: eligibility.isEligible,
    eligibility,
    issues,
  };
};

export const selectBestEligibleBranch = (
  branches: readonly BranchOperationalSnapshot[],
  context: BranchEligibilityContext
): BranchDomainResult<BranchValidationResult> => {
  const eligible = branches
    .map((branch) => validateBranchForAssignment(branch, context))
    .filter((result) => result.isValid);

  if (eligible.length === 0) {
    return branchDomainFail(
      BRANCH_DOMAIN_ERROR_CODES.NO_ELIGIBLE_BRANCH,
      BRANCH_DOMAIN_ERROR_MESSAGES.NO_ELIGIBLE_BRANCH
    );
  }

  const ranked = [...eligible].sort((left, right) => {
    const leftScore = calculateBranchScore({ branch: findBranch(branches, left.branchId)!, cartItemIds: context.cartItemIds });
    const rightScore = calculateBranchScore({ branch: findBranch(branches, right.branchId)!, cartItemIds: context.cartItemIds });

    if (leftScore.total !== rightScore.total) {
      return rightScore.total - leftScore.total;
    }

    return left.branchId.localeCompare(right.branchId);
  });

  return branchDomainOk(ranked[0]!);
};

const findBranch = (
  branches: readonly BranchOperationalSnapshot[],
  branchId: string
): BranchOperationalSnapshot | undefined => branches.find((branch) => branch.branchId === branchId);
