# M5 PR-13 — Owner Branch Management Foundation Report

**PR:** BHOS-M5-PR13  
**Date:** 2026-06-26  
**Status:** ✅ Complete — owner presentation foundation wired via BranchFacade

---

## 1. Presentation Architecture

```
Owner UI (future)
        ↓
OwnerBranchFacade
        ↓
BranchFacade
        ↓
BranchSDK / BranchOperationsSDK
        ↓
Repository
        ↓
Operational Availability
```

**Owner presentation communicates exclusively through BranchFacade. No UI component may access BranchSDK directly.**

| Module | Path |
|--------|------|
| Facade | `src/lib/owner-branches/OwnerBranchFacade.ts` |
| Context mapper | `src/lib/owner-branches/OwnerBranchContext.ts` |
| Session | `src/lib/owner-branches/OwnerBranchSession.ts` |
| Error mapper | `src/lib/owner-branches/OwnerBranchErrorMapper.ts` |
| Telemetry | `src/lib/owner-branches/OwnerBranchTelemetry.ts` |
| Feature flags | `src/lib/owner-branches/ownerBranchFeatureFlags.ts` |
| Types | `src/lib/owner-branches/types.ts` |
| README | `src/lib/owner-branches/README.md` |

Read-only orchestration only. No branch creation, editing, deletion, or persistence writes.

---

## 2. Facade Flow

| Step | Layer | Action |
|------|-------|--------|
| 1 | OwnerBranchFacade | Gate on `FF_BRANCH_OWNER_ENABLED` |
| 2 | OwnerBranchContext | Map owner query → BranchFacade query |
| 3 | BranchFacade | Delegate to BranchSDK or BranchOperationsSDK |
| 4 | OwnerBranchErrorMapper | Map BranchFacade errors → owner-facing errors |
| 5 | OwnerBranchSession | Update in-memory session state |
| 6 | OwnerBranchTelemetry | Record request/success/failure/retry timing |

No assignment, scoring, branch selection, or writes.

---

## 3. BranchFacade Integration

| OwnerBranchFacade method | BranchFacade delegate |
|--------------------------|----------------------|
| `listOwnerBranches` | `listBranches` |
| `getOwnerBranch` | `getBranch` |
| `getOwnerBranchOperationalAvailability` | `getOperationalAvailability` |
| `validateOwnerBranch` | `validateBranch` |
| `estimateOwnerBranchEta` | `estimateETA` |
| `retryOwnerBranch` / `retry` | Replays last operation via BranchFacade |
| `clearOwnerBranchSession` / `resetSession` | Clears session + telemetry |

**BranchFacade extension (PR-13):** Added `getOperationalAvailability` operation delegating to `BranchOperationsSDK` via optional `operationsSdk` dep. Existing BranchFacade consumers unchanged.

---

## 4. Session Lifecycle

Session states: `idle` · `loading` · `success` · `empty` · `error` · `disabled` · `retry`

| API | Purpose |
|-----|---------|
| `subscribeOwnerBranchSession(listener)` | Pub/sub for session changes |
| `getOwnerBranchSessionSnapshot()` | Current session snapshot |
| `clearOwnerBranchSession()` / `resetSession` | Reset session + telemetry |
| `retryOwnerBranch()` / `retry` | Retry last request (max 3 attempts) |

In-memory only — no React state, no Firestore.

---

## 5. Error Mapping

| Scenario | Owner error |
|----------|-------------|
| Flag OFF | `NOT_CONFIGURED` / `featureDisabled: true` |
| Repository unavailable | `UNAVAILABLE` |
| Branch not found | `NOT_FOUND` |
| Invalid owner query | `VALIDATION` |
| BranchFacade validation failure | Mapped via `mapBranchFacadeErrorToOwner` |

Owner-facing messages are presentation-safe; SDK error codes preserved for telemetry.

---

## 6. Telemetry

Events: `OWNER_BRANCH_REQUEST`, `OWNER_BRANCH_SUCCESS`, `OWNER_BRANCH_FAILURE`, `OWNER_BRANCH_RETRY`, `OWNER_BRANCH_DISABLED`

Timing breakdown: facade delegation duration per operation.

Injectable `onTelemetry` hook via `OwnerBranchFacadeDeps`.

---

## 7. Testing

**File:** `src/lib/__tests__/ownerBranchFacade.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Flag OFF → disabled | ✅ |
| Factory / deps resolution | ✅ |
| `listOwnerBranches` success | ✅ |
| `getOwnerBranch` success | ✅ |
| `getOwnerBranchOperationalAvailability` success | ✅ |
| `validateOwnerBranch` success | ✅ |
| `estimateOwnerBranchEta` success | ✅ |
| NOT_CONFIGURED (operations SDK disabled) | ✅ |
| UNAVAILABLE (repository unavailable) | ✅ |
| Retry lifecycle | ✅ |
| Reset / clear session | ✅ |
| Session pub/sub | ✅ |
| Telemetry events | ✅ |
| Error mapping | ✅ |
| Query validation | ✅ |
| Deterministic outputs | ✅ |

Mock **BranchFacadeDeps** (`sdk` + `operationsSdk`) only — no BranchSDK direct access, no React, no Firestore.

**Result:** 487 / 487 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Owner UI bypasses BranchFacade | Module law enforced; no BranchSDK imports in owner-branches |
| BranchFacade regression | Existing BranchFacade tests unchanged; new operation additive |
| Operations SDK coupling | `operationsSdk` optional dep; owner layer gates on owner flag |
| Production impact | `FF_BRANCH_OWNER_ENABLED` default OFF; no UI consumers |
| Checkout / Orders / Discovery / Search impact | Zero changes |
| Accidental writes | Read-only API surface; no create/edit/delete methods |

---

## 9. Rollback

- Set `FF_BRANCH_OWNER_ENABLED` OFF → facade returns `NOT_CONFIGURED` / disabled session
- Remove `src/lib/owner-branches/` module
- Optionally revert BranchFacade `getOperationalAvailability` if no other consumers need it

No data migration required.

---

## 10. Definition of Done

- [x] `OwnerBranchFacade.ts`
- [x] `OwnerBranchContext.ts`
- [x] `OwnerBranchSession.ts`
- [x] `OwnerBranchErrorMapper.ts`
- [x] `OwnerBranchTelemetry.ts`
- [x] `ownerBranchFeatureFlags.ts`
- [x] `types.ts`
- [x] README
- [x] `FF_BRANCH_OWNER_ENABLED` (default OFF)
- [x] Unit tests (mock BranchFacade only)
- [x] No UI components
- [x] No BranchSDK modification
- [x] No Assignment Engine modification
- [x] No Checkout / Orders / Discovery / Search changes
- [x] No persistence writes

**Await ARB approval before M5 PR-14.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **BranchSDK** — sole authority for branch selection
- **BranchFacade** — presentation entry to BranchSDK
- **OwnerBranchFacade** — owner presentation entry to BranchFacade only
- **Repository** — I/O only; **Domain** — business rules; **SDK** — orchestration
