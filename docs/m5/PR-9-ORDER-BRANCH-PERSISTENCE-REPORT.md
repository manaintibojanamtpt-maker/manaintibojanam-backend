# M5 PR-9 — Order Branch Persistence Integration Report

**PR:** BHOS-M5-PR9  
**Date:** 2026-06-26  
**Status:** ✅ Complete — first persistence integration of branch assignment

---

## 1. Order Persistence Architecture

```
CheckoutBranchContext (PR-8 in-memory snapshot)
        ↓
OrderBranchPersistence.resolveOrderBranchPersistence()
        ↓
OrderBranchValidation + OrderBranchMapper
        ↓
Enriched order payload (branchId + assignment metadata)
        ↓
Order creation (caller — api.ts / createOrder)
        ↓
Order Created
```

**No BranchSDK calls. No reassignment. No rescoring. No branch lookup.**

| Module | Path |
|--------|------|
| Orchestration | `src/lib/orders/OrderBranchPersistence.ts` |
| Mapper | `src/lib/orders/OrderBranchMapper.ts` |
| Validation | `src/lib/orders/OrderBranchValidation.ts` |
| Telemetry | `src/lib/orders/OrderBranchTelemetry.ts` |

---

## 2. Persistence Flow

| Step | Action |
|------|--------|
| 1 | Gate on `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` — OFF → skip (unchanged order schema) |
| 2 | Validate checkout context + tenantId |
| 3 | Map `CheckoutBranchContextSnapshot` → order branch fields |
| 4 | Merge fields into order payload |
| 5 | Optional write via `OrderBranchWritePort` (mock in tests) |

Branch selection does **not** occur during persistence — only consumes existing assignment snapshot.

---

## 3. Assignment Mapping

| Order field | Source |
|-------------|--------|
| `branchId` | Assignment summary `branchId` |
| `branchAssignmentId` | `assignmentId` |
| `branchAssignmentReason` | Assignment reason |
| `branchName` | Denormalized display name |
| `branchAssignmentAlgorithmVersion` | `BRANCH_DOMAIN_VERSION` |
| `branchAssignmentPolicyVersion` | `BRANCH_ASSIGNMENT_METADATA_VERSION` |
| `branchAssignmentGeneratedAt` | Context `resolvedAt` |

**Legacy checkout:** `branchId = tenantId` only (no assignment metadata).

---

## 4. Validation

`OrderBranchValidation` checks before persistence:

| Rule | Error |
|------|-------|
| Missing `tenantId` | `VALIDATION` |
| Non-legacy context without assignment | `MISSING_ASSIGNMENT` |
| Assignment tenant ≠ order tenant | `TENANT_MISMATCH` |
| Missing `branchId` / `assignmentId` on summary | `VALIDATION` |

Legacy context (`context.legacy: true`) bypasses assignment requirement.

---

## 5. Telemetry

`OrderBranchTelemetry` events (optional `onTelemetry` hook):

| Event | When |
|-------|------|
| `persist_request` | Persistence started |
| `persist_success` | Fields mapped and merged |
| `persist_skipped` | Flag OFF |
| `persist_failure` | Validation failed |

Duration timing via `beginOrderBranchTelemetry` / `completeOrderBranchTelemetry`.

---

## 6. Testing

**File:** `src/lib/__tests__/orderBranchPersistence.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Flag OFF → skip | ✅ |
| Assignment present → full metadata | ✅ |
| Missing assignment → rejection | ✅ |
| Legacy checkout → `branchId = tenantId` | ✅ |
| Metadata mapping | ✅ |
| Tenant mismatch validation | ✅ |
| Mock write port | ✅ |
| Telemetry | ✅ |
| Flag OFF skip telemetry | ✅ |

Mock order persistence only — no live Firestore.

**Result:** 427 / 427 tests pass (`npm run test:sdk`)

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Reassignment during persistence | No BranchSDK; snapshot consumed as-is |
| Production order schema change | `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` default OFF |
| Checkout regression | Checkout module untouched |
| Assignment engine drift | Assignment engine untouched |
| Discovery / Search impact | Zero changes |
| Payment regression | Payment flow untouched |

---

## 8. Rollback

- Set `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` OFF → current order schema (no branch fields)
- Remove `src/lib/orders/` module
- Caller stops invoking `resolveOrderBranchPersistence`

No data migration required for rollback — additive fields only when flag ON.

---

## 9. Definition of Done

- [x] `OrderBranchPersistence.ts`
- [x] `OrderBranchMapper.ts`
- [x] `OrderBranchValidation.ts`
- [x] `OrderBranchTelemetry.ts`
- [x] README
- [x] `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` (default OFF)
- [x] Reuses `CheckoutBranchContextSnapshot` from PR-8
- [x] Unit tests (mock write port)
- [x] No BranchSDK calls
- [x] No reassignment / rescoring
- [x] No Checkout modification
- [x] No payment / Discovery / Search changes

**Await ARB approval before M5 PR-10.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **BranchSDK** selects branches at checkout — not at order persistence
- **Order persistence** consumes assignment snapshot — does not recompute
- **Checkout** resolves branch before payment — unchanged by this PR
