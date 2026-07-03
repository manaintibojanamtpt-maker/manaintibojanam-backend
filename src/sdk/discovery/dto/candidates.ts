/**
 * DiscoverySDK — read-only discovery DTOs (M3 foundation).
 */

import type { BranchId, DiscoverySortBy, Geohash } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { GeoPoint } from '../../location/dto/geo';
import type { DeliveryEligibility } from './eligibility';
import type { ETAEstimate } from './eta';
import type { RankingReason } from './results';

/** Customer discovery request. */
export interface DiscoveryQuery {
  readonly customerPoint: GeoPoint;
  readonly customerGeohash?: Geohash;
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly searchText?: string;
  readonly cuisineTags?: readonly string[];
  readonly areaCode?: string;
  readonly tenantId?: TenantId;
  readonly includeClosed?: boolean;
  readonly sortBy?: DiscoverySortBy;
}

/** Unified search + geo filter. */
export interface SearchFilter {
  readonly query: DiscoveryQuery;
  readonly name?: string;
  readonly cuisineTags?: readonly string[];
  readonly areaCode?: string;
  readonly minRating?: number;
}

/** Raw branch/tenant before ranking and eligibility refinement. */
export interface DiscoveryCandidate {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly name: string;
  readonly slug: string;
  readonly point: GeoPoint;
  readonly geohash: Geohash;
  readonly distanceKm?: number;
  readonly maxRadiusKm?: number;
  readonly prepTimeMins?: number;
  readonly cuisineTags?: readonly string[];
  readonly rating?: number;
  readonly isOpen?: boolean;
  readonly isLive?: boolean;
  readonly status?: string;
  readonly thumbnailUrl?: string;
}

/** Tenant-scoped branch discovery result. */
export interface NearbyBranch {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly geohash: Geohash;
  readonly eligibility: DeliveryEligibility;
  readonly eta?: ETAEstimate;
  readonly ranking?: RankingReason;
}

/** Marketplace restaurant card. */
export interface NearbyRestaurant {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly name: string;
  readonly slug: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly geohash: Geohash;
  readonly eligibility: DeliveryEligibility;
  readonly eta?: ETAEstimate;
  readonly rating?: number;
  readonly isOpen: boolean;
  readonly thumbnailUrl?: string;
  readonly ranking?: RankingReason;
}

/** Filter for tenant-scoped branch queries. */
export interface NearbyBranchFilter {
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly geohashPrecision?: number;
  readonly includeClosed?: boolean;
}

/** Filter for marketplace restaurant queries. */
export interface NearbyRestaurantFilter {
  readonly customerPoint: GeoPoint;
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly cuisineTags?: readonly string[];
  readonly areaCode?: string;
  readonly minRating?: number;
  readonly sortBy?: DiscoverySortBy;
  readonly includeClosed?: boolean;
}
