/**
 * BranchSDK — branch detail DTOs (M5 PR-1 foundation).
 */

import type { TenantId } from '../../core/types';
import type { GeoPoint } from '../../location/dto/geo';
import type { Geohash } from '../../discovery/types/branded';
import type { BranchId, BranchStatusValue } from '../types/branded';
import type { BranchCapacitySnapshot } from './capacity';
import type { BranchHoursSnapshot } from './hours';
import type { BranchLiveStatus } from './status';

export interface BranchLocationSnapshot {
  readonly point: GeoPoint;
  readonly geohash?: Geohash;
  readonly formattedAddress?: string;
}

export interface BranchSummary {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly slug: string;
  readonly status: BranchStatusValue;
  readonly isDefault: boolean;
}

export interface BranchDetail extends BranchSummary {
  readonly location: BranchLocationSnapshot;
  readonly deliveryConfigId?: string;
  readonly hours?: BranchHoursSnapshot;
  readonly liveStatus?: BranchLiveStatus;
  readonly capacity?: BranchCapacitySnapshot;
}
