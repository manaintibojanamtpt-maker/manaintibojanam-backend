# BranchSDK — Repository

**Version:** M5 PR-3 — persistence abstractions only  
**Flag:** `FF_BRANCH_REPOSITORY_ENABLED` (default **OFF**)

---

## Architecture

```
BranchSDK (PR-4+)
        ↓
BranchRepository (contract — PR-1)
        ↓
BranchRepositoryAdapter (PR-3)
        ↓
BranchPersistencePort → future Firestore adapter (PR-4+)
        ↓
BranchRepositoryMapper → SDK DTOs
```

**Repository responsibilities only:**

- Read branch documents
- List branches for a tenant
- Read capacity, inventory, hours, status, routing config

**Repository must NOT:**

- Write or mutate data
- Perform assignment or selection
- Calculate scores or eligibility
- Call Discovery, Search, or Checkout
- Import React or domain scoring logic

---

## Module Layout

| File | Purpose |
|------|---------|
| `BranchRepository.ts` | Port contract (PR-1) |
| `BranchPersistenceModels.ts` | Neutral read models for future collections |
| `BranchRepositoryPorts.ts` | `BranchPersistencePort` injectable interface |
| `BranchRepositoryMapper.ts` | Persistence record → SDK DTO |
| `BranchRepositoryAdapter.ts` | `BranchRepository` implementation |
| `BranchRepositoryFactory.ts` | Flag-gated factory + DI |
| `StubBranchRepository.ts` | `NOT_CONFIGURED` stub |

---

## Future Firestore Collections (design only — no migration)

| Collection | Read model |
|------------|------------|
| `branches/{branchId}` | `BranchDocumentRecord` |
| `branchInventory/{branchId}/items/{menuItemId}` | `BranchInventoryDocumentRecord` |
| `branchCapacity/{branchId}` | `BranchCapacityDocumentRecord` |
| `branchHours/{branchId}/rules/{ruleId}` | `BranchHoursDocumentRecord` |
| `branchStatus/{branchId}` | `BranchStatusDocumentRecord` |
| `branchRouting/{tenantId}` | `BranchRoutingDocumentRecord` |

---

## Feature Flag

| Flag | Default | Behaviour |
|------|---------|-----------|
| `FF_BRANCH_REPOSITORY_ENABLED` | **OFF** | `StubBranchRepository` |
| ON + `persistencePort` | — | `BranchRepositoryAdapter` |
| ON without port | — | Stub (safe default) |
| `repository` override | — | Injected instance |

```typescript
import { createBranchRepository } from '@/sdk/branch/repository/BranchRepositoryFactory';

const repository = createBranchRepository({
  persistencePort: myPort,
  featureFlags: () => true,
});
```

---

## Deterministic Ordering

`listBranches` returns summaries sorted by `branchId` ascending.

---

*See [`docs/m5/PR-3-BRANCH-REPOSITORY-REPORT.md`](../../../docs/m5/PR-3-BRANCH-REPOSITORY-REPORT.md)*
