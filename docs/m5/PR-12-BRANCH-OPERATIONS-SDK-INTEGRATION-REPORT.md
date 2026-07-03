# M5 PR-12 — Branch Operations SDK Integration Report

**PR:** BHOS-M5-PR12  
**Date:** 2026-06-26  
**Status:** ✅ Complete — operations orchestration wired into BranchSDK layer

---

## 1. SDK Architecture

```
BranchOperationsSDK
        ↓
DefaultBranchOperationsAdapter
        ↓
BranchOperationsOrchestrator
        ↓
BranchOperationsRepository (PR-11)
        ↓
Operational Snapshot DTO
        ↓
Operations Evaluator (domain, PR-10)
        ↓
BranchOperationsAvailabilityDto
```

**SDK orchestrates only. Repository is I/O only. Evaluator holds business rules.**

| Module | Path |
|--------|------|
| Factory | `src/sdk/branch/operations-sdk/createBranchOperationsSdk.ts` |
| Adapter | `src/sdk/branch/operations-sdk/DefaultBranchOperationsAdapter.ts` |
| Orchestrator | `src/sdk/branch/operations-sdk/BranchOperationsOrchestrator.ts` |
| Domain mapper | `src/sdk/branch/operations-sdk/BranchOperationsDomainMapper.ts` |
| Error mapper | `src/sdk/branch/operations-sdk/BranchOperationsErrorMapper.ts` |
| Telemetry | `src/sdk/branch/operations-sdk/BranchOperationsTelemetry.ts` |
| Contract | `src/sdk/branch/operations-sdk/contracts/BranchOperationsSDK.ts` |
| DTOs | `src/sdk/branch/dto/operations.ts` |

---

## 2. Orchestration Flow

| Step | Layer | Action |
|------|-------|--------|
| 1 | SDK | Gate on `FF_BRANCH_OPERATIONS_SDK_ENABLED` |
| 2 | Orchestrator | Validate query |
| 3 | Repository | Load `BranchOperationalSnapshotDto` |
| 4 | Domain mapper | Map DTO → `BranchOperationalSnapshot` + weekly hours |
| 5 | Domain evaluator | `evaluateBranchOperations` (injectable) |
| 6 | Domain mapper | Map summary → `BranchOperationsAvailabilityDto` |
| 7 | Telemetry | Record pipeline timing |

No scoring, assignment, or branch selection.

---

## 3. Repository Integration

- Uses PR-11 `BranchOperationsRepository` unchanged
- `getOperationalSnapshot` for aggregated reads
- Individual reads available via repository contract
- `repositoryEnabled` requires `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` or injected repository

---

## 4. Domain Integration

- Injectable `BranchOperationsEvaluatorFn` for tests
- Default delegates to `evaluateBranchOperations` with `operationsEnabled: true`
- Maps hours rules → `BranchDayHours[]` for schedule evaluation
- Maps domain `BranchAvailabilitySummary` → SDK DTO without duplicating rules

---

## 5. Error Mapping

| Scenario | SDK error |
|----------|-----------|
| Flag OFF | `NOT_CONFIGURED` |
| Repository disabled | `UNAVAILABLE` / `REPOSITORY_UNAVAILABLE` |
| Missing document | `NOT_FOUND` |
| Invalid query | `VALIDATION` |

---

## 6. Telemetry

Events: `BRANCH_OPERATIONS_REQUEST`, `REPOSITORY_READ`, `DOMAIN_EVALUATION`, `SUCCESS`, `FAILURE`

Timing breakdown: validation, repository, domain, total.

---

## 7. Testing

**File:** `src/sdk/__tests__/branchOperationsSdk.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Flag OFF → NOT_CONFIGURED | ✅ |
| Factory / stub selection | ✅ |
| Repository + domain orchestration | ✅ |
| Operational snapshot read | ✅ |
| NOT_FOUND | ✅ |
| UNAVAILABLE (repo disabled) | ✅ |
| Query validation | ✅ |
| DTO mapping | ✅ |
| Deterministic outputs | ✅ |
| Telemetry | ✅ |
| SDK override injection | ✅ |

Mock repository and injectable domain evaluator only.

**Result:** 471 / 471 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Business logic in SDK | Orchestration only; evaluator in domain |
| Assignment engine regression | Assignment engine untouched |
| Repository contract drift | Repository contracts unchanged |
| Production impact | `FF_BRANCH_OPERATIONS_SDK_ENABLED` default OFF |
| Checkout / Orders impact | Zero changes |

---

## 9. Rollback

- Set `FF_BRANCH_OPERATIONS_SDK_ENABLED` OFF → stub adapter (NOT_CONFIGURED)
- Remove `src/sdk/branch/operations-sdk/` module

No data migration required.

---

## 10. Definition of Done

- [x] `DefaultBranchOperationsAdapter.ts`
- [x] `BranchOperationsOrchestrator.ts`
- [x] `BranchOperationsDomainMapper.ts`
- [x] `BranchOperationsErrorMapper.ts`
- [x] `BranchOperationsTelemetry.ts`
- [x] `createBranchOperationsSdk.ts`
- [x] README
- [x] `FF_BRANCH_OPERATIONS_SDK_ENABLED` (default OFF)
- [x] Unit tests (mock repository + evaluator)
- [x] No Assignment Engine modification
- [x] No Checkout / Orders / Discovery / Search changes
- [x] No repository contract changes

**Await ARB approval before M5 PR-13.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **Repository** — I/O only
- **Domain evaluator** — business rules only
- **SDK** — orchestrates reads and mapping, does not select branches
