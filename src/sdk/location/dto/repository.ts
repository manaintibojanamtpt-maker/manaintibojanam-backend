/**
 * LocationSDK — repository read-model DTOs.
 */

import type { BranchId, LocationId } from '../types/branded';
import type { TenantId } from '../../core/types';
import type { IndiaAddress } from './address';
import type { DeliveryConfigReadModel } from './delivery';
import type { GeoPoint } from './geo';

export interface LocationReadModel {
  readonly id: LocationId;
  readonly tenantId: TenantId;
  readonly branchId?: BranchId;
  readonly address: IndiaAddress;
  readonly point: GeoPoint;
  readonly geohash: string;
}

export interface BranchLocationReadModel {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly slug: string;
  readonly status: 'draft' | 'active' | 'closed' | 'suspended';
  readonly location: LocationReadModel;
  readonly deliveryConfig?: DeliveryConfigReadModel;
  readonly isDefault: boolean;
}

export interface GeoIndexEntry {
  readonly geohashPrefix: string;
  readonly geohash: string;
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly point: GeoPoint;
  readonly status: 'active' | 'closed';
  readonly name: string;
  readonly slug: string;
}
