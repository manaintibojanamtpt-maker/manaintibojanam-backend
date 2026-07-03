/**
 * DiscoverySDK — eligibility evaluation DTOs (M3 PR-4).
 */

import type { DiscoveryCandidate } from './candidates';
import type { DeliveryEligibility } from './eligibility';

export type EligibilityRuleId =
  | 'valid_coordinates'
  | 'branch_active'
  | 'branch_live'
  | 'kitchen_open'
  | 'inside_delivery_radius'
  | 'delivery_config_valid';

export interface EligibilityReason {
  readonly rule: EligibilityRuleId;
  readonly passed: boolean;
  readonly message?: string;
}

/** Candidate after eligibility evaluation — may be ineligible with explainable reasons. */
export interface EligibleCandidate {
  readonly candidate: DiscoveryCandidate;
  readonly isEligible: boolean;
  readonly distanceKm: number;
  readonly eligibility: DeliveryEligibility;
  readonly reasons: readonly EligibilityReason[];
}
