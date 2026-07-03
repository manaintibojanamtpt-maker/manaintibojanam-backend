/**
 * DiscoverySDK — type barrel exports.
 */

export type {
  BranchId,
  Geohash,
  DiscoverySortBy,
  DiscoveryTimestamp,
  DiscoveryProviderKind,
} from './branded';

export type { DiscoverySDK, DiscoverySDKFactory } from '../contracts/DiscoverySDK';
export type { DiscoveryRepository, DiscoveryRepositoryFactory } from '../repository/DiscoveryRepository';
export type { RankingEngine, RankingContext, DiscoveryRankingWeightKey } from '../ranking/RankingEngine';
export type { RankedCandidate, RankingBreakdown, RankingPolicyId } from '../dto/rankedCandidate';
export { DISCOVERY_RANKING_WEIGHTS } from '../ranking/RankingEngine';
export type { DiscoveryFilterStage, FilteredCandidate } from '../filters/DiscoveryFilters';

export type {
  DiscoveryQuery,
  SearchFilter,
  DiscoveryCandidate,
  NearbyBranch,
  NearbyRestaurant,
  NearbyBranchFilter,
  NearbyRestaurantFilter,
  DeliveryEligibility,
  DeliveryEligibilityStatus,
  ETAEstimate,
  DiscoveryResult,
  RankingReason,
  RankingFactor,
} from '../dto';

export type { DiscoverySdkFeatureFlag } from '../core/featureFlags';
export {
  DISCOVERY_SDK_FEATURE_FLAG_DEFAULTS,
  DISCOVERY_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../core/featureFlags';

export {
  DISCOVERY_SDK_VERSION,
  DISCOVERY_SDK_FROZEN,
  DISCOVERY_SDK_MODULE,
} from '../version';
