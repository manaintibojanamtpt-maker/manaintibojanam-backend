/**
 * BranchSDK — DTO barrel exports.
 */

export type {
  BranchSelectionQuery,
  BranchEligibilityQuery,
  BranchListFilter,
  BranchAssignmentRequest,
  BranchOverrideRequest,
  BranchETAInput,
  BranchValidationInput,
  BranchAssignmentReason,
} from './queries';

export type { BranchScore, BranchScoreFactor, BranchScoreInput, BranchScoreSignal } from './score';
export type { BranchEligibility, BranchCandidate } from './eligibility';
export type { BranchAssignment, BranchValidationResult } from './assignment';
export type { BranchSummary, BranchDetail, BranchLocationSnapshot } from './branch';
export type { BranchCapacitySnapshot, BranchCapacityRecord } from './capacity';
export type { BranchInventoryItem, BranchInventorySnapshot } from './inventory';
export type { BranchHoursRule, BranchHoursException, BranchHoursSnapshot } from './hours';
export type { BranchLiveStatus, BranchStatusSnapshot } from './status';
export type {
  BranchRoutingPolicy,
  BranchRoutingWeights,
  BranchFailoverPolicy,
  BranchRoutingSignal,
} from './routing';
export type { BranchETAEstimate } from './eta';
export type {
  BranchOperationsAvailabilityDto,
  BranchOperationsAvailabilityQuery,
  BranchOperationsHoursEvaluationDto,
  BranchOperationsCapacityEvaluationDto,
  BranchOperationsInventoryEvaluationDto,
  BranchOperationsStatusEvaluationDto,
} from './operations';
