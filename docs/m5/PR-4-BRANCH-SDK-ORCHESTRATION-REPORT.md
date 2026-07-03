# M5 PR-4 — BranchSDK Adapter & Orchestration Report

**PR:** BHOS-M5-PR4  
**Date:** 2026-06-26  
**Status:** ✅ Complete — adapter + orchestration only

---

## 1. SDK Architecture

```
Presentation (PR-5+)
        ↓
BranchSDK contract
        ↓
createBranchSDK factory
        ↓
DefaultBranchAdapter
        ↓
BranchSdkOrchestrator
   ├── BranchRepository (reads)
   └── Domain (eligibility + validation)
```

**Factory resolution:**

1. Injected `branchSdk` override
2. `FF_BRANCH_ENABLED` ON → `DefaultBranchAdapter`
3. OFF → `StubBranchAdapter`

---

## 2. Adapter Flow

| Method | Flow |
|--------|------|
| `listBranches` | validate → repository.list → return |
| `getBranch` | repository.getBranchById → return |
| `findEligibleBranches` | validate → list → load bundles → domain filter → map candidates |
| `validateBranch` | validate → sync snapshot resolver → domain validate → map DTO |
| `estimateETA` | validate → load bundle → domain eligibility gate → ETA estimate |
| `findBestBranch` | `NOT_CONFIGURED` |
| `assignBranch` | `NOT_CONFIGURED` |
| `overrideAssignment` | `NOT_CONFIGURED` |

No scoring. No best-branch selection. No assignment.

---

## 3. Repository Integration

Orchestrator calls `BranchRepository` read methods:

- `listBranches`
- `getBranchById`
- `getBranchStatus`
- `getBranchCapacity`
- `getBranchInventory`

Repository errors normalized via `BranchErrorMapper.mapRepositoryResultToSdk`.

When `FF_BRANCH_REPOSITORY_ENABLED` is OFF and no repository injected → `UNAVAILABLE`.

Injected `branchRepository` bypasses repository flag (test/production override).

---

## 4. Domain Integration

| Domain function | Used by |
|-----------------|---------|
| `filterEligibleBranches` | `findEligibleBranches` |
| `evaluateBranchEligibility` | `estimateETA` gate |
| `validateBranchForAssignment` | `validateBranch` |

Domain logic imported from `src/domain/branch/` — not duplicated in adapter.

`BranchDomainMapper` converts domain results ↔ SDK DTOs and builds `BranchOperationalSnapshot` from repository reads.

---

## 5. Error Mapping

| Source | Mapper |
|--------|--------|
| Domain errors | `mapDomainErrorToSdk` |
| Repository errors | `mapRepositoryResultToSdk` |
| Disabled repository | `repositoryUnavailable` |
| Missing branch | `branchNotFound` |

SDK error codes: `VALIDATION`, `NOT_FOUND`, `UNAVAILABLE`, `NOT_CONFIGURED`.

---

## 6. Telemetry

`BranchTelemetry.ts` provides:

| Event type | When |
|------------|------|
| `BRANCH_SDK_REQUEST` | Method invoked |
| `BRANCH_SDK_SUCCESS` | Successful completion |
| `BRANCH_SDK_FAILURE` | Error path |
| `BRANCH_REPOSITORY_READ` | Repository read completed |
| `BRANCH_DOMAIN_EVALUATION` | Domain evaluation completed |

Optional `onTelemetry` hook in `CreateBranchSDKOptions`.

---

## 7. Testing

**File:** `src/sdk/__tests__/branchSdkOrchestration.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Factory selection (stub / default / injected) | ✅ |
| Validation flow | ✅ |
| Repository orchestration | ✅ |
| Domain eligibility filtering | ✅ |
| DTO mapping | ✅ |
| Error mapping | ✅ |
| Telemetry generation | ✅ |
| NOT_CONFIGURED for assignment | ✅ |
| UNAVAILABLE when repo disabled | ✅ |

Mock repository only — no live Firestore.

**Result:** 365 / 365 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Assignment logic in adapter | Assignment methods remain NOT_CONFIGURED |
| Domain logic duplication | Domain functions imported directly |
| Runtime behaviour change | `FF_BRANCH_ENABLED` default OFF |
| Discovery / Checkout impact | Zero integration |
| Sync validateBranch + async repo | Requires `syncSnapshotResolver` for full validation |

---

## 9. Rollback

- Revert `createBranchSDK.ts` to stub-only factory
- Remove adapter orchestration files
- Remove test file + `package.json` entry
- Flags remain OFF — zero production impact

---

## 10. Definition of Done

- [x] `DefaultBranchAdapter.ts`
- [x] `BranchSdkOrchestrator.ts`
- [x] `BranchDomainMapper.ts`
- [x] `BranchErrorMapper.ts`
- [x] `BranchTelemetry.ts`
- [x] `createBranchSDK.ts` factory wiring
- [x] Adapters README
- [x] Unit tests (mock repository)
- [x] No Assignment Engine
- [x] No Discovery / Checkout / Firestore changes
- [x] No scoring or best-branch selection

**Await ARB approval before M5 PR-5.**

---

## Architectural Law

Permanent rules in [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

1. Tenant = Brand  
2. Branch = Fulfillment Unit  
3. Only BranchSDK chooses branches — assignment arrives PR-5+  
4. Adapter orchestrates — domain owns rules
