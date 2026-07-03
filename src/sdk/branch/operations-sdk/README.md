# BranchSDK — Operations SDK Integration

**Version:** M5 PR-12 — operations orchestration layer  
**Flag:** `FF_BRANCH_OPERATIONS_SDK_ENABLED` (default **OFF**)

---

## Architecture

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

---

## Module Layout

| File | Purpose |
|------|---------|
| `createBranchOperationsSdk.ts` | Flag-gated factory |
| `DefaultBranchOperationsAdapter.ts` | Default SDK adapter |
| `StubBranchOperationsAdapter.ts` | NOT_CONFIGURED fallback |
| `BranchOperationsOrchestrator.ts` | Repository + domain orchestration |
| `BranchOperationsDomainMapper.ts` | DTO ↔ domain mapping |
| `BranchOperationsErrorMapper.ts` | Error normalization |
| `BranchOperationsTelemetry.ts` | Pipeline telemetry |
| `contracts/BranchOperationsSDK.ts` | Public SDK contract |

---

## Usage

```typescript
import { createBranchOperationsSdk } from '@/sdk/branch/operations-sdk/createBranchOperationsSdk';

const operations = createBranchOperationsSdk({
  persistencePort: myPort,
  featureFlags: (flag) => flag === 'FF_BRANCH_OPERATIONS_SDK_ENABLED',
});

const result = await operations.getOperationalAvailability({
  branchId: 'paradise-hitech',
  cartItemIds: ['biryani-veg'],
});
```

---

## Feature Flags

| Flag | Default | Effect |
|------|---------|--------|
| `FF_BRANCH_OPERATIONS_SDK_ENABLED` | OFF | Stub adapter (NOT_CONFIGURED) |
| ON + repository port | — | Default adapter with orchestration |

Requires `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` (or injected repository) for live reads.

---

## Constraints

- No scoring, assignment, or branch selection
- No Checkout, Orders, Discovery, or Search changes
- No repository contract changes
- No Firestore implementation

---

*See [`docs/m5/PR-12-BRANCH-OPERATIONS-SDK-INTEGRATION-REPORT.md`](../../../docs/m5/PR-12-BRANCH-OPERATIONS-SDK-INTEGRATION-REPORT.md)*
