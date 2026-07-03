/**
 * DiscoverySDK — discovery result and ranking explanation DTOs (read-only).
 */

import type { NearbyRestaurant } from './candidates';
import type { DiscoveryPipelineTelemetry } from '../pipeline/types';

export interface RankingFactor {
  readonly factor: string;
  readonly weight: number;
  readonly signal: number;
  readonly contribution: number;
}

/** Explainable ranking breakdown for transparency. */
export interface RankingReason {
  readonly score: number;
  readonly rank: number;
  readonly factors: readonly RankingFactor[];
}

export interface DiscoveryResult {
  readonly restaurants: readonly NearbyRestaurant[];
  readonly totalCandidates: number;
  readonly queryRadiusKm: number;
  readonly customerGeohash?: string;
  readonly rankedAt: number;
  readonly telemetry?: DiscoveryPipelineTelemetry;
}
