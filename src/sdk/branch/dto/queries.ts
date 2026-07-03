/**
 * BranchSDK — query DTOs (M5 PR-1 foundation).
 */

import type { TenantId } from '../../core/types';
import type { GeoPoint } from '../../location/dto/geo';
import type { Geohash } from '../../discovery/types/branded';
import type {
  BranchAssignmentId,
  BranchId,
  BranchOrderType,
  BranchStatusValue,
} from '../types/branded';

export interface BranchSelectionQuery {
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly customerGeohash?: Geohash;
  readonly orderType: BranchOrderType;
  readonly cartItemIds?: readonly string[];
  readonly preferredBranchId?: BranchId;
  readonly excludeBranchIds?: readonly BranchId[];
  readonly correlationId?: string;
}

export interface BranchEligibilityQuery {
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly orderType: BranchOrderType;
  readonly includeClosed?: boolean;
  readonly limit?: number;
}

export interface BranchListFilter {
  readonly tenantId: TenantId;
  readonly status?: BranchStatusValue;
  readonly includeInactive?: boolean;
  readonly limit?: number;
}

export interface BranchAssignmentRequest {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly customerPoint: GeoPoint;
  readonly draftOrderId?: string;
  readonly sessionId?: string;
  readonly reason: BranchAssignmentReason;
  readonly correlationId?: string;
}

export interface BranchOverrideRequest {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly customerPoint: GeoPoint;
  readonly previousAssignmentId?: BranchAssignmentId;
  readonly draftOrderId?: string;
  readonly overriddenBy: 'customer' | 'owner' | 'system';
}

export interface BranchETAInput {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly orderType: BranchOrderType;
}

export interface BranchValidationInput {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly customerPoint: GeoPoint;
  readonly orderType: BranchOrderType;
  readonly cartItemIds?: readonly string[];
}

export type BranchAssignmentReason =
  | 'nearest_serviceable'
  | 'lowest_eta'
  | 'capacity_failover'
  | 'inventory_failover'
  | 'customer_override'
  | 'owner_override'
  | 'pickup_selected'
  | 'default_branch';
