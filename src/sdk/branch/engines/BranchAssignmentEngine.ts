/**
 * BranchSDK — assignment engine port (M5 PR-1 foundation).
 * Domain implementation arrives in M5 PR-2 — interface only.
 */

import type { BranchCandidate } from '../dto/eligibility';
import type { BranchScore, BranchScoreInput } from '../dto/score';

export interface BranchAssignmentEngine {
  /** Pure scoring for explainability — no side effects. */
  calculateScore(input: BranchScoreInput): BranchScore;

  /** Deterministic ordering of eligible candidates. */
  rankCandidates(candidates: readonly BranchCandidate[]): BranchCandidate[];
}
