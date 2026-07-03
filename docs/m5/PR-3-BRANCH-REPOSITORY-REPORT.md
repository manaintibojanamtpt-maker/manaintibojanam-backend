# M5 PR-3 — Branch Repository Report

**PR:** BHOS-M5-PR3  
**Date:** 2026-06-26  
**Status:** ✅ Complete — persistence abstractions only

---

## 1. Repository Architecture

```
BranchSDK (PR-4+)
        ↓
BranchRepository (contract — PR-1)
        ↓
BranchRepositoryAdapter
        ↓
BranchPersistencePort (injectable)
        ↓
BranchRepositoryMapper → SDK DTOs
```

**Module layout:**

```
src/sdk/branch/repository/
├── BranchRepository.ts              (PR-1 contract)
├── BranchPersistenceModels.ts         (neutral read models)
├── BranchRepositoryPorts.ts           (BranchPersistencePort)
├── BranchRepositoryMapper.ts          (record → DTO)
├── BranchRepositoryAdapter.ts         (read implementation)
├── BranchRepositoryFactory.ts         (DI + flag gating)
├── StubBranchRepository.ts            (NOT_CONFIGURED)
├── BranchAssignmentRepository.ts      (PR-1 — unchanged)
└── README.md
```

**Read operations only:**

| Method | Source (future) |
|--------|-----------------|
| `listBranches` | `branches/` |
| `getBranchById` | `branches/{branchId}` |
| `getBranchCapacity` | `branchCapacity/{branchId}` |
| `getBranchInventory` | `branchInventory/{branchId}` |
| `getBranchHours` | `branchHours/{branchId}` |
| `getBranchStatus` | `branchStatus/{branchId}` |
| `getRoutingPolicy` | `branchRouting/{tenantId}` |

No writes. No assignment. No selection. No scoring.

---

## 2. Persistence Model

Neutral read models in `BranchPersistenceModels.ts` — no Firestore SDK types:

| Model | Future collection |
|-------|-------------------|
| `BranchDocumentRecord` | `branches/{branchId}` |
| `BranchInventoryDocumentRecord` | `branchInventory/{branchId}` |
| `BranchCapacityDocumentRecord` | `branchCapacity/{branchId}` |
| `BranchHoursDocumentRecord` | `branchHours/{branchId}` |
| `BranchStatusDocumentRecord` | `branchStatus/{branchId}` |
| `BranchRoutingDocumentRecord` | `branchRouting/{tenantId}` |

`BRANCH_PERSISTENCE_SCHEMA_VERSION = 1`

No collections created. No migration. No rules changes.

---

## 3. DTO Mapping

`BranchRepositoryMapper.ts` — pure functions:

| Mapper | Output DTO |
|--------|------------|
| `mapBranchDocumentToSummary` | `BranchSummary` |
| `mapBranchDocumentToDetail` | `BranchDetail` |
| `mapBranchCapacityDocument` | `BranchCapacityRecord` |
| `mapBranchInventoryDocument` | `BranchInventorySnapshot` |
| `mapBranchHoursDocument` | `BranchHoursSnapshot` |
| `mapBranchStatusDocument` | `BranchStatusSnapshot` |
| `mapBranchRoutingDocument` | `BranchRoutingPolicy` |
| `filterBranchDocuments` | Active-only filter + `branchId` sort |

---

## 4. Dependency Injection

**Factory:** `createBranchRepository(options)`

| Option | Behaviour |
|--------|-----------|
| `repository` | Use injected instance (highest priority) |
| `persistencePort` + flag ON | `BranchRepositoryAdapter` |
| Flag OFF or no port | `StubBranchRepository` |

**Flag:** `FF_BRANCH_REPOSITORY_ENABLED` (default **OFF**)

```typescript
const repository = createBranchRepository({
  persistencePort: myPort,
  featureFlags: () => true,
});
```

`CreateBranchSDKOptions.branchRepository` (PR-1) accepts injected repository for PR-4 wiring.

---

## 5. Testing

**File:** `src/sdk/__tests__/branchRepository.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Mapper — summary, detail, sub-records | ✅ |
| Active document filter + sort | ✅ |
| Factory — flag off / on / DI override | ✅ |
| Adapter — list, read, NOT_FOUND | ✅ |
| Error mapping — UNAVAILABLE | ✅ |
| Stub — NOT_CONFIGURED | ✅ |

No live Firestore. Mock `BranchPersistencePort` only.

**Result:** 351 / 351 tests pass (`npm run test:sdk`)

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Business logic in repository | Adapter is I/O + map only |
| Accidental Firestore coupling | `BranchPersistencePort` is vendor-neutral |
| Production data access | `FF_BRANCH_REPOSITORY_ENABLED` default OFF |
| Discovery / Checkout / Search impact | Zero changes to frozen platforms |
| Premature assignment wiring | `BranchAssignmentRepository` untouched |

---

## 7. Rollback

- Remove new repository implementation files
- Remove `FF_BRANCH_REPOSITORY_ENABLED` from feature flags
- Remove test file + `package.json` entry
- Stub remains safe default — zero runtime impact

---

## 8. Definition of Done

- [x] `BranchPersistenceModels.ts`
- [x] `BranchRepositoryPorts.ts`
- [x] `BranchRepositoryMapper.ts`
- [x] `BranchRepositoryAdapter.ts`
- [x] `BranchRepositoryFactory.ts`
- [x] `StubBranchRepository.ts`
- [x] Repository README
- [x] Unit tests (mock ports only)
- [x] `FF_BRANCH_REPOSITORY_ENABLED` (OFF)
- [x] No Firestore migration
- [x] No Assignment Engine
- [x] No Discovery / Checkout / Search changes

**Await ARB approval before M5 PR-4.**

---

## Architectural Law

Permanent rules in [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

1. Tenant = Brand  
2. Branch = Fulfillment Unit  
3. Repository reads data — **does not** select branches  
4. Only BranchSDK chooses branches (engine in PR-4+)
