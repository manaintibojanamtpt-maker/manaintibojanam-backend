# BranchSDK — Operations Repository

**Version:** M5 PR-11 — operational read models  
**Flag:** `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` (default **OFF**)

---

## Architecture

```
BranchOperationsPersistencePort (injectable)
        ↓
BranchOperationsRepositoryAdapter
        ↓
BranchOperationsMapper
        ↓
Operational Snapshot DTO
        ↓
Future Consumers (Assignment Engine · BranchFacade · Checkout)
```

**Read-only infrastructure. No business logic. No Firestore implementation in this PR.**

---

## Module Layout

| File | Purpose |
|------|---------|
| `BranchOperationsPersistencePort.ts` | Vendor-neutral read port |
| `BranchOperationsRepository.ts` | Repository contract + snapshot DTO |
| `BranchOperationsMapper.ts` | Persistence record → DTO mapping |
| `BranchOperationsRepositoryAdapter.ts` | Port adapter (I/O only) |
| `BranchOperationsRepositoryFactory.ts` | Flag-gated factory |
| `StubBranchOperationsRepository.ts` | NOT_CONFIGURED fallback |

---

## Operational Snapshot DTO

`BranchOperationalSnapshotDto` bundles:

- `status` — live branch status
- `hours` — schedule rules + exceptions
- `capacity` — queue load and congestion
- `inventory` — item availability
- `capturedAt` — latest signal timestamp

---

## Feature Flag

| Flag | Default | Effect |
|------|---------|--------|
| `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | OFF | Stub repository (NOT_CONFIGURED) |
| ON + port | — | Adapter available via factory |

No presentation consumers in PR-11.

---

## Constraints

- No scoring, eligibility, assignment, or operational evaluation
- No Checkout, Orders, Discovery, or Search changes
- No Firestore implementation — ports only

---

*See [`docs/m5/PR-11-BRANCH-OPERATIONS-REPOSITORY-REPORT.md`](../../../docs/m5/PR-11-BRANCH-OPERATIONS-REPOSITORY-REPORT.md)*
