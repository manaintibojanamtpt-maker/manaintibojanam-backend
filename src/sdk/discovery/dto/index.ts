/**
 * DiscoverySDK — DTO barrel exports.
 */

export type {
  DiscoveryQuery,
  SearchFilter,
  DiscoveryCandidate,
  NearbyBranch,
  NearbyRestaurant,
  NearbyBranchFilter,
  NearbyRestaurantFilter,
} from './candidates';

export type { DeliveryEligibility, DeliveryEligibilityStatus } from './eligibility';
export type {
  EligibilityReason,
  EligibilityRuleId,
  EligibleCandidate,
} from './eligibleCandidate';
export type { ETAEstimate } from './eta';
export type { DiscoveryResult, RankingReason, RankingFactor } from './results';
export type {
  DiscoveryPipelineCounts,
  DiscoveryPipelineFlags,
  DiscoveryPipelineHooks,
  DiscoveryPipelineStage,
  DiscoveryPipelineTelemetry,
  DiscoveryPipelineTimingMs,
  DiscoveryPipelineTrace,
} from '../pipeline/types';
export type {
  RankedCandidate,
  RankingBreakdown,
  RankingPolicyId,
} from './rankedCandidate';
