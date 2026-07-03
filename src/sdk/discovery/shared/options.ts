/**
 * DiscoverySDK — factory options (contracts only).
 */

import type { LocationSDK } from '../../location/contracts/LocationSDK';
import type { BranchFeatureFlagReader } from '../../branch/core/featureFlags';
import type { BranchDiscoveryReadPort } from '../branch/BranchCandidateTypes';
import type { BranchCandidateTelemetryHook } from '../branch/BranchCandidateTelemetry';
import type { DiscoveryFeatureFlagReader } from '../core/featureFlags';
import type { EligibilityEngine } from '../eligibility/EligibilityEnginePort';
import type { DiscoveryPipelineHooks } from '../pipeline/types';
import type { GeoIndexPort } from '../repository/GeoIndexPort';
import type { GeoIndexRepositoryHooks } from '../repository/GeoIndexRepository';
import type { DiscoveryRepository } from '../repository/DiscoveryRepository';
import type { RankingEngine } from '../ranking/RankingEngine';
import type { DiscoveryProviderKind } from '../types/branded';

export interface CreateDiscoverySDKOptions {
  readonly repository?: DiscoveryRepository;
  readonly locationSdk?: LocationSDK;
  readonly rankingEngine?: RankingEngine;
  readonly eligibilityEngine?: EligibilityEngine;
  readonly providerKind?: DiscoveryProviderKind;
  readonly featureFlags?: DiscoveryFeatureFlagReader;
  readonly pipelineHooks?: DiscoveryPipelineHooks;
  readonly geoIndexPort?: GeoIndexPort;
  readonly geoIndexHooks?: GeoIndexRepositoryHooks;
  readonly branchReadPort?: BranchDiscoveryReadPort;
  readonly branchFeatureFlags?: BranchFeatureFlagReader;
  readonly branchCandidateTelemetry?: BranchCandidateTelemetryHook;
}
