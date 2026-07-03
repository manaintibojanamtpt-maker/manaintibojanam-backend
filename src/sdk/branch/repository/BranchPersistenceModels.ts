/**
 * BranchSDK — neutral persistence read models (M5 PR-3).
 * Maps to future Firestore collections — no Firestore types.
 *
 * Collections (future):
 *   branches/{branchId}
 *   branchInventory/{branchId}/items/{menuItemId}
 *   branchCapacity/{branchId}
 *   branchHours/{branchId}/rules/{ruleId}
 *   branchStatus/{branchId}
 *   branchRouting/{tenantId}
 */

import type {
  BranchCongestionLevel,
  BranchKitchenState,
  BranchStatusValue,
} from '../types/branded';

export const BRANCH_PERSISTENCE_SCHEMA_VERSION = 1;

/** Future: `branches/{branchId}` */
export interface BranchDocumentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly slug: string;
  readonly name: string;
  readonly status: BranchStatusValue;
  readonly locationId: string;
  readonly deliveryConfigId?: string;
  readonly isDefault: boolean;
  readonly geohash?: string;
  readonly coordinates?: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly formattedAddress?: string;
  readonly schemaVersion?: number;
  readonly updatedAt?: number;
}

/** Future: `branchInventory/{branchId}/items/{menuItemId}` */
export interface BranchInventoryItemDocumentRecord {
  readonly menuItemId: string;
  readonly quantity?: number;
  readonly isAvailable: boolean;
  readonly updatedAt?: number;
}

/** Aggregated inventory read model for a branch */
export interface BranchInventoryDocumentRecord {
  readonly branchId: string;
  readonly tenantId: string;
  readonly items: readonly BranchInventoryItemDocumentRecord[];
  readonly updatedAt?: number;
}

/** Future: `branchCapacity/{branchId}` */
export interface BranchCapacityDocumentRecord {
  readonly branchId: string;
  readonly tenantId: string;
  readonly activeOrders: number;
  readonly maxConcurrentOrders: number;
  readonly prepQueueMins: number;
  readonly congestionLevel: BranchCongestionLevel;
  readonly acceptingOrders: boolean;
  readonly updatedAt?: number;
}

/** Future: `branchHours/{branchId}/rules/{ruleId}` */
export interface BranchHoursRuleDocumentRecord {
  readonly id?: string;
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly openTime: string;
  readonly closeTime: string;
  readonly isClosed: boolean;
}

/** Future: `branchHours/{branchId}/exceptions/{exceptionId}` */
export interface BranchHoursExceptionDocumentRecord {
  readonly date: string;
  readonly isClosed: boolean;
  readonly openTime?: string;
  readonly closeTime?: string;
  readonly label?: string;
}

/** Aggregated hours read model for a branch */
export interface BranchHoursDocumentRecord {
  readonly branchId: string;
  readonly tenantId: string;
  readonly rules: readonly BranchHoursRuleDocumentRecord[];
  readonly exceptions?: readonly BranchHoursExceptionDocumentRecord[];
  readonly timezone?: string;
  readonly updatedAt?: number;
}

/** Future: `branchStatus/{branchId}` */
export interface BranchStatusDocumentRecord {
  readonly branchId: string;
  readonly tenantId: string;
  readonly isOpen: boolean;
  readonly isBusy: boolean;
  readonly kitchenState: BranchKitchenState;
  readonly manualOverride?: {
    readonly isOpen: boolean;
    readonly reason?: string;
    readonly until?: number;
  };
  readonly updatedAt: number;
}

/** Future: `branchRouting/{tenantId}` */
export interface BranchRoutingDocumentRecord {
  readonly tenantId: string;
  readonly scoringWeights: {
    readonly distance: number;
    readonly eta: number;
    readonly deliveryFee: number;
    readonly capacityHeadroom: number;
    readonly inventoryAvailability: number;
    readonly openStatus: number;
  };
  readonly failoverPolicy: {
    readonly enabled: boolean;
    readonly maxAttempts: number;
    readonly preferSameZone: boolean;
  };
  readonly autoSelectEnabled: boolean;
  readonly schemaVersion: number;
  readonly updatedAt?: number;
}
