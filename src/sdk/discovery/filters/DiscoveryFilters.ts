/**
 * DiscoverySDK — filter stage identifiers (architecture only).
 */

import type { DiscoveryCandidate } from '../dto/candidates';
import type { DeliveryEligibility } from '../dto/eligibility';

export type DiscoveryFilterStage =
  | 'geohash_prefix'
  | 'distance'
  | 'delivery_radius'
  | 'availability'
  | 'cuisine'
  | 'rating';

export interface FilteredCandidate {
  readonly candidate: DiscoveryCandidate;
  readonly eligibility?: DeliveryEligibility;
  readonly excluded?: boolean;
  readonly excludedAtStage?: DiscoveryFilterStage;
  readonly exclusionReason?: string;
}
