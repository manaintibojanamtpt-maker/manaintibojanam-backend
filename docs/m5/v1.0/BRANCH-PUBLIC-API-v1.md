# Branch Public API v1.0

**Status:** Frozen — M5 PR-15  
**Date:** 2026-06-26  
**Module:** `src/sdk/branch/`  
**Contract file:** `src/sdk/branch/contracts/BranchSDK.ts`  
**Runtime version:** `1.0.0` · **Frozen:** yes (ADR-016 accepted 2026-06-26)

---

## 1. BranchSDK (frozen surface)

Presentation **must not** import BranchSDK directly — use `BranchFacade`, `CheckoutBranchFacade`, or `OwnerBranchFacade`. SDK is the certified boundary for tests, future npm package, and server adapters.

### Factory

```typescript
createBranchSDK(options?: CreateBranchSDKOptions): BranchSDK
```

| Option | Purpose |
|--------|---------|
| `featureFlags` | Override `FF_BRANCH_*` reader |
| `repository` | Inject `BranchRepository` (tests) |
| `assignmentEngine` | Inject assignment engine (tests) |

When `FF_BRANCH_ENABLED` is OFF → `StubBranchAdapter` (all methods `NOT_CONFIGURED`).

---

### `findBestBranch(query: BranchSelectionQuery): SdkAsyncResult<BranchAssignment>`

**Purpose:** Select the best fulfillment branch for a brand + customer context.

**Gate:** `FF_BRANCH_ENABLED` + `FF_BRANCH_ASSIGNMENT_ENABLED`

**Output:** `BranchAssignment` with score, eligibility, optional ETA.

**Errors:** `NOT_CONFIGURED`, `VALIDATION`, `UNAVAILABLE`, `NOT_FOUND`

---

### `findEligibleBranches(query: BranchEligibilityQuery): SdkAsyncResult<BranchCandidate[]>`

**Purpose:** List branches passing eligibility gates (override picker, pickup).

**Gate:** `FF_BRANCH_ENABLED`

---

### `assignBranch(request: BranchAssignmentRequest): SdkAsyncResult<BranchAssignment>`

**Purpose:** Persist an assignment decision (draft order / session).

**Gate:** `FF_BRANCH_ENABLED`

---

### `overrideAssignment(request: BranchOverrideRequest): SdkAsyncResult<BranchAssignment>`

**Purpose:** Customer or owner manual override — re-validates eligibility.

**Gate:** `FF_BRANCH_ENABLED`

---

### `estimateETA(input: BranchETAInput): SdkAsyncResult<BranchETAEstimate>`

**Purpose:** ETA from branch point + capacity signals.

**Gate:** `FF_BRANCH_ENABLED`

---

### `getBranch(branchId: BranchId): SdkAsyncResult<BranchDetail>`

**Purpose:** Branch detail card.

**Gate:** `FF_BRANCH_ENABLED` + repository availability

---

### `listBranches(filter: BranchListFilter): SdkAsyncResult<BranchSummary[]>`

**Purpose:** List branches for a brand (owner / admin scope).

**Gate:** `FF_BRANCH_ENABLED` + repository availability

---

### `validateBranch(input: BranchValidationInput): SdkResult<BranchValidationResult>`

**Purpose:** Validate branch still serviceable for cart + customer point.

**Gate:** `FF_BRANCH_ENABLED`

---

## 2. BranchOperationsSDK (frozen surface)

**Module:** `src/sdk/branch/operations-sdk/contracts/BranchOperationsSDK.ts`

### Factory

```typescript
createBranchOperationsSdk(options?: CreateBranchOperationsSdkOptions): BranchOperationsSDK
```

When `FF_BRANCH_OPERATIONS_SDK_ENABLED` is OFF → stub adapter (`NOT_CONFIGURED`).

### Methods

| Method | Purpose |
|--------|---------|
| `getOperationalAvailability(query)` | Hours + capacity + inventory summary DTO |
| `getOperationalSnapshot(branchId)` | Raw operational snapshot |

**Gate chain:** `FF_BRANCH_OPERATIONS_SDK_ENABLED` → requires repository (`FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` or injection).

---

## 3. BranchRepository (frozen port)

**Module:** `src/sdk/branch/repository/BranchRepository.ts`

| Method | Purpose |
|--------|---------|
| `listBranches(filter)` | Brand branch list |
| `getBranchById(branchId)` | Branch detail |
| `getBranchStatus(branchId)` | Live status |
| `getBranchHours(branchId)` | Hours snapshot |
| `getBranchCapacity(branchId)` | Capacity record |
| `getBranchInventory(branchId)` | Inventory snapshot |
| `getRoutingPolicy(tenantId)` | Routing policy |

Read-only. No write methods in v1.0.

---

## 4. BranchFacade (presentation API)

**Module:** `src/lib/branch/BranchFacade.ts`  
**Flag:** `FF_BRANCH_ENABLED`

| Function | SDK delegate |
|----------|--------------|
| `listBranches(query, deps?)` | `listBranches` |
| `getBranch(query, deps?)` | `getBranch` |
| `findEligibleBranches(query, deps?)` | `findEligibleBranches` |
| `validateBranch(query, deps?)` | `validateBranch` |
| `estimateETA(query, deps?)` | `estimateETA` |
| `findBestBranch(query, deps?)` | `findBestBranch` |
| `getOperationalAvailability(query, deps?)` | `BranchOperationsSDK` |
| `retryBranch(deps?)` | Retry last operation |
| `resetSession()` | Clear session |
| `subscribeSession(listener)` | Session pub/sub |

---

## 5. CheckoutBranchFacade (presentation API)

**Module:** `src/lib/checkout/CheckoutBranchFacade.ts`  
**Flag:** `FF_BRANCH_CHECKOUT_ENABLED`

| Function | Purpose |
|----------|---------|
| `resolveCheckoutBranch(query, deps?)` | Assign branch before payment |
| `retryCheckoutBranchAssignment(deps?)` | Retry assignment |
| `clearCheckoutBranchSession()` | Reset session |

When OFF → legacy tenant-only checkout path (no SDK call).

---

## 6. OwnerBranchFacade (presentation API)

**Module:** `src/lib/owner-branches/OwnerBranchFacade.ts`  
**Flag:** `FF_BRANCH_OWNER_ENABLED`

| Function | BranchFacade delegate |
|----------|----------------------|
| `listOwnerBranches` | `listBranches` |
| `getOwnerBranch` | `getBranch` |
| `getOwnerBranchOperationalAvailability` | `getOperationalAvailability` |
| `validateOwnerBranch` | `validateBranch` |
| `estimateOwnerBranchEta` | `estimateETA` |
| `retryOwnerBranch` / `retry` | Retry last operation |
| `clearOwnerBranchSession` / `resetSession` | Reset session |

Read-only. No writes in v1.0.

---

## 7. Order branch persistence (presentation)

**Module:** `src/lib/orders/OrderBranchPersistence.ts`  
**Flag:** `FF_BRANCH_ORDER_PERSISTENCE_ENABLED`

| Function | Purpose |
|----------|---------|
| `applyBranchToOrderDraft(snapshot, orderDraft)` | Additive `branchId` fields from checkout snapshot |

Consumes `CheckoutBranchContextSnapshot` only — no BranchSDK calls.

---

## 8. Feature flags (SDK core)

**Module:** `src/sdk/branch/core/featureFlags.ts`

| Flag | Env key | Default |
|------|---------|---------|
| `FF_BRANCH_ENABLED` | `VITE_FF_BRANCH_ENABLED` | OFF |
| `FF_BRANCH_REPOSITORY_ENABLED` | `VITE_FF_BRANCH_REPOSITORY_ENABLED` | OFF |
| `FF_BRANCH_ASSIGNMENT_ENABLED` | `VITE_FF_BRANCH_ASSIGNMENT_ENABLED` | OFF |
| `FF_BRANCH_DISCOVERY_ENABLED` | `VITE_FF_BRANCH_DISCOVERY_ENABLED` | OFF |
| `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | `VITE_FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | OFF |
| `FF_BRANCH_OPERATIONS_SDK_ENABLED` | `VITE_FF_BRANCH_OPERATIONS_SDK_ENABLED` | OFF |

### Presentation flags (separate modules)

| Flag | Module | Default |
|------|--------|---------|
| `FF_BRANCH_CHECKOUT_ENABLED` | `src/lib/checkout/` | OFF |
| `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` | `src/lib/orders/` | OFF |
| `FF_BRANCH_OWNER_ENABLED` | `src/lib/owner-branches/` | OFF |
| `FF_BRANCH_OPERATIONS_ENABLED` | `src/domain/branch/operations/` | OFF (domain metadata) |

---

## 9. Error codes (stable)

| Code | Meaning |
|------|---------|
| `NOT_CONFIGURED` | Feature flag OFF or stub adapter |
| `VALIDATION` | Invalid query / input |
| `UNAVAILABLE` | Repository or dependency unavailable |
| `NOT_FOUND` | Branch or document missing |
| `FORBIDDEN` | Access denied |
| `RATE_LIMITED` | Throttled |

---

## Version metadata

- `BRANCH_SDK_VERSION = '1.0.0'` ✅ (ADR-016 accepted 2026-06-26)
- `BRANCH_SDK_FROZEN = true` ✅
- Git tag: `branch-platform-v1.0` (pending)

Breaking changes post-freeze require ADR + major version bump.

---

## References

- `docs/m5/BRANCH-SDK-DESIGN.md` — design source
- `docs/adr/ADR-015-branch-platform-architecture.md`
- `docs/adr/ADR-016-branch-platform-v1-freeze.md`
