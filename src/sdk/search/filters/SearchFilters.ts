/**
 * SearchSDK — pipeline filter stage identifiers (architecture only; M4 PR-1).
 */

import type { SearchIndexHit } from '../dto/repository';
import type { NearbyRestaurant } from '../../discovery/dto/candidates';

export type SearchFilterStage =
  | 'discovery_intersection'
  | 'open_now'
  | 'veg_only'
  | 'min_rating'
  | 'max_delivery_mins'
  | 'max_distance_km';

export interface SearchFilteredHit {
  readonly indexHit?: SearchIndexHit;
  readonly restaurant: NearbyRestaurant;
  readonly excluded?: boolean;
  readonly excludedAtStage?: SearchFilterStage;
  readonly exclusionReason?: string;
}
