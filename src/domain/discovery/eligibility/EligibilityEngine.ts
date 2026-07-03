/**
 * Discovery domain — eligibility stage (M3 PR-4).
 * DiscoveryCandidate[] → EligibleCandidate[] (no ranking, search, or Firestore).
 */

import type { DiscoveryCandidate } from '../../../sdk/discovery/dto/candidates';
import type { EligibleCandidate } from '../../../sdk/discovery/dto/eligibleCandidate';
import type { GeoPoint } from '../../../sdk/location/dto/geo';
import { mapToEligibleCandidate, mapToEligibleCandidates } from './EligibilityMapper';

export class DiscoveryEligibilityEngine {
  evaluateCandidate(
    candidate: DiscoveryCandidate,
    customerPoint: GeoPoint
  ): EligibleCandidate {
    return mapToEligibleCandidate(candidate, customerPoint);
  }

  evaluateCandidates(
    candidates: readonly DiscoveryCandidate[],
    customerPoint: GeoPoint
  ): EligibleCandidate[] {
    return mapToEligibleCandidates(candidates, customerPoint);
  }

  filterEligible(candidates: readonly EligibleCandidate[]): EligibleCandidate[] {
    return candidates.filter((entry) => entry.isEligible);
  }
}

export function createDiscoveryEligibilityEngine(): DiscoveryEligibilityEngine {
  return new DiscoveryEligibilityEngine();
}
