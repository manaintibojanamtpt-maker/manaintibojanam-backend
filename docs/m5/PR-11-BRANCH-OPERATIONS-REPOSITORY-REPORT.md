# M5 PR-11 — Branch Operations Repository Integration Report

**PR:** BHOS-M5-PR11  
**Date:** 2026-06-26  
**Status:** ✅ Complete — read-only operational repository layer

---

## 1. Repository Architecture

```
BranchOperationsPersistencePort (injectable, vendor-neutral)
        ↓
BranchOperationsRepositoryAdapter (I/O only)
        ↓
BranchOperationsMapper
        ↓
BranchOperationalSnapshotDto
        ↓
Future Consumers (Assignment Engine · BranchFacade · Checkout)
```

**No business logic. No Firestore implementation. No runtime consumers in PR-11.**

| Module | Path |
|--------|------|
| Port | `src/sdk/branch/operations/BranchOperationsPersistencePort.ts` |
| Contract | `src/sdk/branch/operations/BranchOperationsRepository.ts` |
| Mapper | `src/sdk/branch/operations/BranchOperationsMapper.ts` |
| Adapter | `src/sdk/branch/operations/BranchOperationsRepositoryAdapter.ts` |
| Factory | `src/sdk/branch/operations/BranchOperationsRepositoryFactory.ts` |
| Stub | `src/sdk/branch/operations/StubBranchOperationsRepository.ts` |

---

## 2. Repository Flow

| Step | Action |
|------|--------|
| 1 | Gate on `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` — OFF → stub |
| 2 | Inject `BranchOperationsPersistencePort` |
| 3 | Adapter reads capacity, inventory, hours, status documents |
| 4 | Mapper converts persistence records → SDK DTOs |
| 5 | `getOperationalSnapshot` bundles all signals with `capturedAt` |

Reuses PR-3 persistence models and record mappers — no duplicate mapping logic.

---

## 3. DTO Mapping

| DTO | Source document |
|-----|-----------------|
| `BranchStatusSnapshot` | `branchStatus/{branchId}` |
| `BranchHoursSnapshot` | `branchHours/{branchId}` |
| `BranchCapacityRecord` | `branchCapacity/{branchId}` |
| `BranchInventorySnapshot` | `branchInventory/{branchId}` |
| `BranchOperationalSnapshotDto` | Aggregated bundle + `capturedAt` |

`capturedAt` = max of status, capacity, and inventory timestamps.

---

## 4. Dependency Injection

```typescript
import { createBranchOperationsRepository } from '@/sdk/branch/operations/BranchOperationsRepositoryFactory';

const repo = createBranchOperationsRepository({
  persistencePort: myPort,
  featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED',
});
```

| Flag | Port | Result |
|------|------|--------|
| OFF | any | `StubBranchOperationsRepository` → NOT_CONFIGURED |
| ON | missing | Stub |
| ON | provided | `BranchOperationsRepositoryAdapter` |

`createBranchOperationsPortFromBranchPort` adapts existing `BranchPersistencePort` subset.

---

## 5. Testing

**File:** `src/sdk/__tests__/branchOperationsRepository.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Hours / capacity / inventory / status mapping | ✅ |
| Operational snapshot aggregation | ✅ |
| NOT_FOUND | ✅ |
| UNAVAILABLE | ✅ |
| Factory selection | ✅ |
| Stub fallback | ✅ |
| Deterministic DTO mapping | ✅ |
| Port adapter from branch port | ✅ |

Mock persistence ports only — no external services.

**Result:** 459 / 459 tests pass (`npm run test:sdk`)

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Business logic in repository | Adapter is I/O + mapping only |
| Accidental branch selection | No assignment or scoring |
| Production impact | Flag default OFF; stub when disabled |
| Firestore coupling | Vendor-neutral ports; no Firestore in PR-11 |
| Assignment engine regression | Assignment engine untouched |
| Operations evaluator integration | Domain evaluator untouched |
| Checkout / Orders / Discovery | Zero changes |

---

## 7. Rollback

- Set `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` OFF → stub repository
- Remove `src/sdk/branch/operations/` module

No data migration required.

---

## 8. Definition of Done

- [x] `BranchOperationsRepository.ts`
- [x] `BranchOperationsPersistencePort.ts`
- [x] `BranchOperationsMapper.ts`
- [x] `BranchOperationsRepositoryAdapter.ts`
- [x] `BranchOperationsRepositoryFactory.ts`
- [x] `StubBranchOperationsRepository.ts`
- [x] README
- [x] `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` (default OFF)
- [x] Unit tests (mock ports)
- [x] No Assignment Engine modification
- [x] No Operations Evaluator integration
- [x] No Checkout / Orders / Discovery / Search changes
- [x] No Firestore implementation

**Await ARB approval before M5 PR-12.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **Repository** performs I/O only — no routing decisions
- **Operations evaluator** (PR-10) consumes signals — does not read persistence directly
- **BranchSDK** orchestrates reads — selection remains in assignment engine only
