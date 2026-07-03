/**
 * Branch domain — score breakdown helpers (M5 PR-2).
 */

import type { BranchScoreBreakdown, BranchScoreFactor, BranchScoreSignal } from '../shared/BranchTypes';
import { BRANCH_SCORE_MAX, BRANCH_SCORE_MIN } from '../shared/BranchConstants';

export const clampBranchScore = (value: number): number => {
  if (!Number.isFinite(value)) {
    return BRANCH_SCORE_MIN;
  }
  if (value < BRANCH_SCORE_MIN) {
    return BRANCH_SCORE_MIN;
  }
  if (value > BRANCH_SCORE_MAX) {
    return BRANCH_SCORE_MAX;
  }
  return value;
};

export const buildBranchScoreFactor = (
  signal: BranchScoreSignal,
  weight: number,
  rawSignal: number,
  label: string
): BranchScoreFactor => {
  const normalizedSignal = clampBranchScore(rawSignal);
  const contribution = clampBranchScore(normalizedSignal * weight);
  return {
    signal,
    weight,
    contribution,
    label,
  };
};

export const buildBranchScoreBreakdown = (
  branchId: string,
  factors: readonly BranchScoreFactor[]
): BranchScoreBreakdown => {
  const total = clampBranchScore(
    factors.reduce((sum, factor) => sum + factor.contribution, 0)
  );

  return {
    branchId,
    total,
    factors,
  };
};

export const compareBranchScoreBreakdowns = (
  left: BranchScoreBreakdown,
  right: BranchScoreBreakdown
): number => {
  if (left.total !== right.total) {
    return right.total - left.total;
  }
  return left.branchId.localeCompare(right.branchId);
};
