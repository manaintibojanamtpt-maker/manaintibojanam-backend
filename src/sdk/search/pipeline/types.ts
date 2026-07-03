/**
 * SearchSDK — discovery enrichment pipeline types (M4 PR-6).
 */

import type { NearbyRestaurant } from '../../discovery/dto/candidates';
import type { DiscoveryResult } from '../../discovery/dto/results';
import type { SearchIndexHit } from '../dto';

export interface SearchEnrichedCandidate {
  readonly hit: SearchIndexHit;
  readonly restaurant: NearbyRestaurant;
}

export interface SearchDiscoveryEnrichment {
  readonly pairs: readonly SearchEnrichedCandidate[];
  readonly discovery: DiscoveryResult;
  readonly correlationId: string;
  readonly discoveryMs: number;
  readonly filterMs: number;
  readonly enrichmentApplied: boolean;
  readonly fallbackReason?: string;
}

export const EMPTY_DISCOVERY_RESULT: DiscoveryResult = {
  restaurants: [],
  totalCandidates: 0,
  queryRadiusKm: 10,
  rankedAt: 0,
};
