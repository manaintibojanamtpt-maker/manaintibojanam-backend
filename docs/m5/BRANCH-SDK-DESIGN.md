# BranchSDK — Public API Design v0.1 (Architecture Only)

**Status:** Design only — **no implementation**  
**Date:** 2026-06-26  
**Module (proposed):** `src/sdk/branch/`  
**Governance:** ADR-015 · ADR-011 strangler pattern

---

## 1. Factory

```typescript
export interface CreateBranchSDKOptions {
  readonly featureFlags?: BranchFeatureFlagReader;
  readonly branchRepository?: BranchRepository;
  readonly locationSdk?: LocationSDK;          // read-only consumption
  readonly referenceSdk?: ReferenceSDK;        // optional — holidays, timezones
}

export interface BranchSDKFactory {
  create(options?: CreateBranchSDKOptions): BranchSDK;
}

export function createBranchSDK(options?: CreateBranchSDKOptions): BranchSDK;
```

When `FF_BRANCH_ENABLED` is OFF → `StubBranchAdapter` (all methods `NOT_CONFIGURED`).

---

## 2. Public contract

```typescript
/**
 * BranchSDK — branch intelligence boundary (M5).
 * No Firestore, REST, or UI in this contract.
 * Consumes LocationSDK for distance — does not replace Discovery ranking.
 */
export interface BranchSDK {
  /** Select single best branch for customer + tenant context. */
  findBestBranch(query: BranchSelectionQuery): SdkAsyncResult<BranchAssignment>;

  /** List all branches passing eligibility gates (override picker, pickup). */
  findEligibleBranches(query: BranchEligibilityQuery): SdkAsyncResult<BranchCandidate[]>;

  /** Pure scoring for explainability / telemetry — no side effects. */
  calculateBranchScore(input: BranchScoreInput): SdkResult<BranchScore>;

  /** Persist assignment decision (draft order / session). */
  assignBranch(request: BranchAssignmentRequest): SdkAsyncResult<BranchAssignment>;

  /** Customer or owner manual override — re-validates eligibility. */
  overrideBranch(request: BranchOverrideRequest): SdkAsyncResult<BranchAssignment>;

  /** Owner / admin — list branches for tenant. */
  listBranches(filter: BranchListFilter): SdkAsyncResult<BranchSummary[]>;

  /** Branch detail card. */
  getBranch(branchId: BranchId): SdkAsyncResult<BranchDetail>;

  /** Branch-scoped inventory snapshot for routing. */
  getBranchInventory(
    branchId: BranchId,
    query?: BranchInventoryQuery
  ): SdkAsyncResult<BranchInventorySnapshot>;

  /** Kitchen load / capacity snapshot. */
  getBranchCapacity(branchId: BranchId): SdkAsyncResult<BranchCapacitySnapshot>;

  /** ETA from branch point + prep/capacity signals. */
  estimateBranchETA(input: BranchETAInput): SdkAsyncResult<BranchETAEstimate>;

  /** Validate branch still serviceable for cart + customer point. */
  validateBranch(input: BranchValidationInput): SdkResult<BranchValidationResult>;
}
```

---

## 3. Core DTOs

### 3.1 Queries

```typescript
export interface BranchSelectionQuery {
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly customerGeohash?: Geohash;
  readonly orderType: 'delivery' | 'pickup';
  readonly cartItemIds?: readonly string[];
  readonly preferredBranchId?: BranchId;
  readonly excludeBranchIds?: readonly BranchId[];
  readonly correlationId?: string;
}

export interface BranchEligibilityQuery {
  readonly tenantId: TenantId;
  readonly customerPoint: GeoPoint;
  readonly orderType: 'delivery' | 'pickup';
  readonly includeClosed?: boolean;
  readonly limit?: number;
}

export interface BranchListFilter {
  readonly tenantId: TenantId;
  readonly status?: BranchStatus;
  readonly includeInactive?: boolean;
}
```

### 3.2 Outputs

```typescript
export interface BranchAssignment {
  readonly assignmentId: string;
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly branchName: string;
  readonly reason: BranchAssignmentReason;
  readonly score: BranchScore;
  readonly eligibility: BranchEligibility;
  readonly eta?: BranchETAEstimate;
  readonly deliveryFee?: number;
  readonly assignedAt: number;
  readonly expiresAt?: number;
  readonly overrideApplied: boolean;
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

export interface BranchCandidate {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly point: GeoPoint;
  readonly distanceKm: number;
  readonly eligibility: BranchEligibility;
  readonly score: BranchScore;
  readonly eta?: BranchETAEstimate;
}

export interface BranchScore {
  readonly total: number;                    // 0..1 normalized
  readonly factors: readonly BranchScoreFactor[];
}

export interface BranchScoreFactor {
  readonly signal: BranchScoreSignal;
  readonly weight: number;
  readonly contribution: number;
  readonly label: string;
}

export type BranchScoreSignal =
  | 'distance'
  | 'eta'
  | 'delivery_fee'
  | 'capacity_headroom'
  | 'inventory_availability'
  | 'rating'
  | 'open_status';

export interface BranchEligibility {
  readonly isEligible: boolean;
  readonly status: 'serviceable' | 'out_of_radius' | 'closed' | 'busy' | 'inventory_short' | 'suspended';
  readonly distanceKm: number;
  readonly maxRadiusKm: number;
  readonly reasons: readonly string[];
}
```

### 3.3 Branch detail / inventory / capacity

```typescript
export interface BranchDetail {
  readonly branchId: BranchId;
  readonly tenantId: TenantId;
  readonly name: string;
  readonly slug: string;                     // internal — not in customer URL
  readonly status: BranchStatus;
  readonly isDefault: boolean;
  readonly location: BranchLocationSnapshot;
  readonly deliveryConfigId: string;
  readonly hours?: BranchHoursSnapshot;
  readonly liveStatus?: BranchLiveStatus;
}

export type BranchStatus = 'draft' | 'active' | 'closed' | 'suspended';

export interface BranchInventorySnapshot {
  readonly branchId: BranchId;
  readonly items: readonly BranchInventoryItem[];
  readonly unavailableItemIds: readonly string[];
  readonly capturedAt: number;
}

export interface BranchInventoryItem {
  readonly menuItemId: string;
  readonly available: boolean;
  readonly quantity?: number;
}

export interface BranchCapacitySnapshot {
  readonly branchId: BranchId;
  readonly activeOrders: number;
  readonly maxConcurrentOrders: number;
  readonly prepQueueMins: number;
  readonly congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  readonly acceptingOrders: boolean;
  readonly capturedAt: number;
}

export interface BranchETAEstimate {
  readonly prepTimeMins: number;
  readonly deliveryTimeMins: number;
  readonly totalMins: number;
  readonly confidence: 'low' | 'medium' | 'high';
}
```

### 3.4 Assignment requests

```typescript
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
  readonly previousAssignmentId?: string;
  readonly draftOrderId?: string;
  readonly overriddenBy: 'customer' | 'owner' | 'system';
}
```

---

## 4. Scoring algorithm (domain — design)

**Weighted composite (deterministic):**

| Signal | Default weight | Source |
|--------|----------------|--------|
| Distance | 0.35 | LocationSDK `calculateDistance` |
| ETA | 0.25 | `estimateBranchETA` |
| Delivery fee parity | 0.10 | Normalized fee vs tenant median |
| Capacity headroom | 0.15 | `branchCapacity` |
| Inventory availability | 0.10 | Cart coverage % |
| Open status | 0.05 | `branchStatus` |

**Tie-break:** lowest `branchId` lexicographic (stable).

**Failover:** If best branch fails `validateBranch`, iterate `findEligibleBranches` by score desc.

Discovery **must not** implement this table.

---

## 5. Repository port (internal — not public SDK)

```typescript
export interface BranchRepository {
  listBranchesByTenant(tenantId: TenantId): SdkAsyncResult<BranchRecord[]>;
  getBranchById(branchId: BranchId): SdkAsyncResult<BranchRecord>;
  getBranchStatus(branchId: BranchId): SdkAsyncResult<BranchStatusRecord>;
  getBranchHours(branchId: BranchId): SdkAsyncResult<BranchHoursRecord>;
  getBranchCapacity(branchId: BranchId): SdkAsyncResult<BranchCapacityRecord>;
  getBranchInventory(branchId: BranchId): SdkAsyncResult<BranchInventoryRecord[]>;
  getRoutingPolicy(tenantId: TenantId): SdkAsyncResult<BranchRoutingPolicy>;
  writeAssignment(record: BranchAssignmentRecord): SdkAsyncResult<BranchAssignmentRecord>;
  writeTelemetry(event: BranchTelemetryEvent): SdkAsyncResult<void>;
}
```

---

## 6. Feature flags

```typescript
export type BranchSdkFeatureFlag =
  | 'FF_BRANCH_ENABLED'
  | 'FF_BRANCH_REPOSITORY_ENABLED'
  | 'FF_BRANCH_AUTO_SELECT_ENABLED'
  | 'FF_BRANCH_OVERRIDE_ENABLED'
  | 'FF_BRANCH_CAPACITY_ENABLED'
  | 'FF_BRANCH_INVENTORY_ENABLED'
  | 'FF_BRANCH_FAILOVER_ENABLED';

export const BRANCH_SDK_FEATURE_FLAG_DEFAULTS = {
  flags: {
    FF_BRANCH_ENABLED: false,
    FF_BRANCH_REPOSITORY_ENABLED: false,
    FF_BRANCH_AUTO_SELECT_ENABLED: false,
    FF_BRANCH_OVERRIDE_ENABLED: false,
    FF_BRANCH_CAPACITY_ENABLED: false,
    FF_BRANCH_INVENTORY_ENABLED: false,
    FF_BRANCH_FAILOVER_ENABLED: false,
  },
} as const;
```

---

## 7. Version constants (proposed)

```typescript
export const BRANCH_SDK_VERSION = '0.1.0-foundation' as const;
export const BRANCH_SDK_FROZEN = false as const;
export const BRANCH_SDK_MODULE = 'branch' as const;
```

Frozen at `1.0.0` in M5 certification PR (mirror Search/Order pattern).

---

## 8. Explicit non-goals (v1)

- Courier API integration
- Real-time driver tracking
- Polygon delivery zones (design in M2 — implement post-v1)
- Branch-level payment accounts
- Modifying DiscoverySDK or SearchSDK contracts
