/**
 * LocationSDK — branch and restaurant discovery DTOs.
 */

import type { BranchId, DiscoverySortBy, Geohash } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { DeliveryConfigReadModel } from './delivery';
import type { GeoPoint } from './geo';

export interface NearbyBranchFilter {
  readonly tenantId?: TenantId;
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly geohashPrecision?: number;
  readonly includeClosed?: boolean;
}

export interface BranchDiscoveryResult {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly geohash: Geohash;
  readonly isServiceable: boolean;
  readonly deliveryConfig?: DeliveryConfigReadModel;
}

export interface NearbyRestaurantFilter {
  readonly radiusKm?: number;
  readonly limit?: number;
  readonly cuisineTags?: readonly string[];
  readonly areaCode?: string;
  readonly minRating?: number;
  readonly sortBy?: DiscoverySortBy;
}

export interface RestaurantDiscoveryResult {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly name: string;
  readonly slug: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly estimatedDeliveryMins?: number;
  readonly rating?: number;
  readonly isOpen: boolean;
  readonly thumbnailUrl?: string;
}
