/**
 * SearchSDK — customer search query DTOs (M4 foundation).
 */

import type { GeoPoint } from '../../location/dto/geo';
import type { Geohash } from '../../discovery/types/branded';
import type { SearchFilter, AreaFilter } from './filters';
import type { SortOption } from './sort';

/** Customer search request (presentation → SearchFacade → SearchSDK). */
export interface SearchQuery {
  /** Raw user input — normalized by pipeline (future PR). */
  readonly text?: string;

  /** Geo anchor — required for marketplace search. */
  readonly customerPoint: GeoPoint;
  readonly customerGeohash?: Geohash;

  /** Discovery context passed through to DiscoverySDK. */
  readonly radiusKm?: number;
  readonly limit?: number;

  /** Structured filters. */
  readonly filters?: SearchFilter;

  /** Sort override. */
  readonly sort?: SortOption;

  /** Facets applied after discovery eligibility. */
  readonly openNow?: boolean;
  readonly vegOnly?: boolean;
  readonly minRating?: number;
  readonly maxDeliveryMins?: number;
  readonly maxDistanceKm?: number;
}

/** Output of normalize stage — stored in metadata for replay/debug. */
export interface NormalizedSearchQuery {
  readonly tokens: readonly string[];
  readonly text?: string;
  readonly inferredCuisine?: readonly string[];
  readonly inferredArea?: AreaFilter;
}
