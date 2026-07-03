/**
 * DiscoverySDK — default eligibility engine adapter (M3 PR-4).
 */

import { createDiscoveryEligibilityEngine } from '../../../domain/discovery/eligibility/EligibilityEngine';
import type { SdkResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { GeoPoint } from '../../location/dto/geo';
import type { DiscoveryCandidate } from '../dto/candidates';
import type { EligibleCandidate } from '../dto/eligibleCandidate';
import type { EligibilityEngine } from './EligibilityEnginePort';

export class DefaultEligibilityEngine implements EligibilityEngine {
  private readonly engine = createDiscoveryEligibilityEngine();

  evaluateCandidate(
    candidate: DiscoveryCandidate,
    customerPoint: GeoPoint
  ): SdkResult<EligibleCandidate> {
    return sdkOk(this.engine.evaluateCandidate(candidate, customerPoint));
  }

  evaluateCandidates(
    candidates: readonly DiscoveryCandidate[],
    customerPoint: GeoPoint
  ): SdkResult<EligibleCandidate[]> {
    return sdkOk(this.engine.evaluateCandidates(candidates, customerPoint));
  }
}

export function createDefaultEligibilityEngine(): EligibilityEngine {
  return new DefaultEligibilityEngine();
}
