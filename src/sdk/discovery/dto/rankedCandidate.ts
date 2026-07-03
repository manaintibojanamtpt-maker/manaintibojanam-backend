/**
 * DiscoverySDK — ranked candidate DTO (M3 PR-5).
 */

import type { EligibleCandidate } from './eligibleCandidate';
import type { RankingFactor } from './results';

export type RankingPolicyId = 'weighted-v1' | 'distance-only-v1';

/** Per-factor weighted contribution for explainable ranking. */
export interface RankingBreakdown {
  readonly weightedScore: number;
  readonly rank: number;
  readonly policy: RankingPolicyId;
  readonly factors: readonly RankingFactor[];
}

/** Candidate after deterministic ranking — eligible input only. */
export interface RankedCandidate {
  readonly candidate: EligibleCandidate;
  readonly score: number;
  readonly breakdown: RankingBreakdown;
  readonly reasons: readonly string[];
  readonly algorithmVersion: string;
  readonly rankingVersion: string;
}
