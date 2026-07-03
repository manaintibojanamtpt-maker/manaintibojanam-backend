/**
 * SearchSDK — neutral tenant read record for search indexing (M4 PR-3).
 */

export interface SearchTenantLocationRecord {
  readonly lat?: number;
  readonly lng?: number;
  readonly geohash?: string;
  readonly areaCode?: string;
  readonly localityName?: string;
  readonly cityName?: string;
  readonly pincode?: string;
  readonly districtName?: string;
  readonly stateName?: string;
  readonly formattedAddress?: string;
}

/** Extended tenant shape for search — includes area metadata not on discovery read port. */
export interface SearchTenantReadRecord {
  readonly id: string;
  readonly slug?: string;
  readonly name?: string;
  readonly status?: string;
  readonly description?: string;
  readonly cuisineTags?: readonly string[];
  readonly ratingAggregate?: number;
  readonly location?: SearchTenantLocationRecord;
}
