/**
 * BranchSDK — domain score → SDK DTO mapper (M5 PR-7).
 */

import type { BranchScoreBreakdown } from '../../../domain/branch/shared/BranchTypes';
import type { BranchScore, BranchScoreFactor } from '../dto/score';
import type { BranchId } from '../types/branded';

export const mapDomainScoreToBranchScore = (breakdown: BranchScoreBreakdown): BranchScore => ({
  branchId: breakdown.branchId as BranchId,
  total: breakdown.total,
  factors: breakdown.factors.map(
    (factor): BranchScoreFactor => ({
      signal: factor.signal,
      weight: factor.weight,
      contribution: factor.contribution,
      label: factor.label,
    })
  ),
});

export const mapDomainScoresToBranchScores = (
  breakdowns: readonly BranchScoreBreakdown[]
): BranchScore[] => breakdowns.map(mapDomainScoreToBranchScore);
