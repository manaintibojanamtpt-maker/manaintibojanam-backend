/**
 * Branch domain — shared types (M5 PR-2).
 * Pure domain — no SDK, Firestore, or UI imports.
 */

export type BranchId = string;
export type TenantId = string;

export interface GeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export type BranchOrderType = 'delivery' | 'pickup';

export type BranchEligibilityStatus =
  | 'serviceable'
  | 'out_of_radius'
  | 'closed'
  | 'busy'
  | 'inventory_short'
  | 'suspended';

export type BranchOperationalStatus = 'draft' | 'active' | 'closed' | 'suspended';

export type BranchCongestionLevel = 'low' | 'medium' | 'high' | 'critical';

export interface BranchSelectionQuery {
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly orderType: BranchOrderType;
  readonly cartItemIds?: readonly string[];
  readonly preferredBranchId?: BranchId;
  readonly excludeBranchIds?: readonly BranchId[];
  readonly correlationId?: string;
}

export interface BranchDeliveryZone {
  readonly freeRadiusKm?: number;
  readonly paidRadiusKm?: number;
  readonly maxRadiusKm: number;
}

export interface BranchOperationalSnapshot {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly status: BranchOperationalStatus;
  readonly isDefault: boolean;
  readonly distanceKm: number;
  readonly deliveryZone: BranchDeliveryZone;
  readonly isOpen: boolean;
  readonly isBusy: boolean;
  readonly acceptingOrders: boolean;
  readonly congestionLevel?: BranchCongestionLevel;
  readonly activeOrders?: number;
  readonly maxConcurrentOrders?: number;
  readonly prepQueueMins?: number;
  readonly etaMins?: number;
  readonly deliveryFee?: number;
  readonly rating?: number;
  readonly unavailableMenuItemIds?: readonly string[];
}

export interface BranchEligibilityResult {
  readonly branchId: BranchId;
  readonly isEligible: boolean;
  readonly status: BranchEligibilityStatus;
  readonly distanceKm: number;
  readonly maxRadiusKm: number;
  readonly reasons: readonly string[];
}

export interface BranchValidationResult {
  readonly branchId: BranchId;
  readonly isValid: boolean;
  readonly eligibility: BranchEligibilityResult;
  readonly issues: readonly string[];
}

export type BranchScoreSignal =
  | 'distance'
  | 'eta'
  | 'delivery_fee'
  | 'capacity_headroom'
  | 'inventory_availability'
  | 'rating'
  | 'open_status';

export interface BranchScoreFactor {
  readonly signal: BranchScoreSignal;
  readonly weight: number;
  readonly contribution: number;
  readonly label: string;
}

export interface BranchScoreBreakdown {
  readonly branchId: BranchId;
  readonly total: number;
  readonly factors: readonly BranchScoreFactor[];
}

export interface BranchScoredCandidate {
  readonly branch: BranchOperationalSnapshot;
  readonly eligibility: BranchEligibilityResult;
  readonly score: BranchScoreBreakdown;
}
