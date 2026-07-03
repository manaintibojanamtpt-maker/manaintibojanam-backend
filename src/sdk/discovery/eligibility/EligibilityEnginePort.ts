/**
 * DiscoverySDK — eligibility engine port (M3 PR-4).
 */

import type { SdkResult } from '../../core/result';
import type { GeoPoint } from '../../location/dto/geo';
import type { DiscoveryCandidate } from '../dto/candidates';
import type { EligibleCandidate } from '../dto/eligibleCandidate';

export interface EligibilityEngine {
  evaluateCandidate(
    candidate: DiscoveryCandidate,
    customerPoint: GeoPoint
  ): SdkResult<EligibleCandidate>;

  evaluateCandidates(
    candidates: readonly DiscoveryCandidate[],
    customerPoint: GeoPoint
  ): SdkResult<EligibleCandidate[]>;
}
