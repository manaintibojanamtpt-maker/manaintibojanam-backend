/**
 * BranchSDK — type barrel exports.
 */

export type {
  BranchId,
  BranchAssignmentId,
  BranchTimestamp,
  BranchStatusValue,
  BranchEligibilityStatus,
  BranchOrderType,
  BranchCongestionLevel,
  BranchKitchenState,
} from './branded';

export type { BranchSDK, BranchSDKFactory } from '../contracts/BranchSDK';
export type { BranchRepository } from '../repository/BranchRepository';
export type { BranchAssignmentRepository, BranchAssignmentRecord } from '../repository/BranchAssignmentRepository';
export type { BranchAssignmentEngine } from '../engines/BranchAssignmentEngine';

export type {
  BranchSelectionQuery,
  BranchEligibilityQuery,
  BranchListFilter,
  BranchAssignmentRequest,
  BranchOverrideRequest,
  BranchETAInput,
  BranchValidationInput,
  BranchAssignmentReason,
  BranchScore,
  BranchScoreFactor,
  BranchScoreInput,
  BranchScoreSignal,
  BranchEligibility,
  BranchCandidate,
  BranchAssignment,
  BranchValidationResult,
  BranchSummary,
  BranchDetail,
  BranchLocationSnapshot,
  BranchCapacitySnapshot,
  BranchCapacityRecord,
  BranchInventoryItem,
  BranchInventorySnapshot,
  BranchHoursRule,
  BranchHoursException,
  BranchHoursSnapshot,
  BranchLiveStatus,
  BranchStatusSnapshot,
  BranchRoutingPolicy,
  BranchRoutingWeights,
  BranchFailoverPolicy,
  BranchRoutingSignal,
  BranchETAEstimate,
} from '../dto';

export type { BranchSdkFeatureFlag } from '../core/featureFlags';
export {
  BRANCH_SDK_FEATURE_FLAG_DEFAULTS,
  BRANCH_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../core/featureFlags';

export {
  BRANCH_PLATFORM_LAW,
  BRANCH_PLATFORM_LAW_STATEMENTS,
} from '../core/platformLaw';

export {
  BRANCH_SDK_VERSION,
  BRANCH_SDK_FROZEN,
  BRANCH_SDK_MODULE,
} from '../version';
