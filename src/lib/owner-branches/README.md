# Owner Branch Management Facade

**Version:** M5 PR-13 — owner branch presentation foundation  
**Flag:** `FF_BRANCH_OWNER_ENABLED` (default **OFF**)

---

## Architecture

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

**Presentation communicates exclusively through BranchFacade. No direct BranchSDK access.**

---

## Supported Operations

| Method | BranchFacade delegate |
|--------|----------------------|
| `listOwnerBranches` | `listBranches` |
| `getOwnerBranch` | `getBranch` |
| `getOwnerBranchOperationalAvailability` | `getOperationalAvailability` |
| `validateOwnerBranch` | `validateBranch` |
| `estimateOwnerBranchEta` | `estimateETA` |
| `retryOwnerBranch` | Retries last operation |
| `clearOwnerBranchSession` | Resets session + telemetry |

Read-only. No assignment, scoring, selection, or writes.

---

## Module Layout

| File | Purpose |
|------|---------|
| `OwnerBranchFacade.ts` | Public owner presentation API |
| `OwnerBranchContext.ts` | Owner query → BranchFacade query |
| `OwnerBranchSession.ts` | In-memory session pub/sub |
| `OwnerBranchTelemetry.ts` | Request/success/failure/retry timing |
| `ownerBranchFeatureFlags.ts` | `FF_BRANCH_OWNER_ENABLED` |
| `OwnerBranchErrorMapper.ts` | Owner-facing error messages |
| `types.ts` | Owner presentation types |

---

## Feature Flag

| Flag | Env key | Default | Effect |
|------|---------|---------|--------|
| `FF_BRANCH_OWNER_ENABLED` | `VITE_FF_BRANCH_OWNER_ENABLED` | OFF | Facade disabled |

No UI consumers when flag OFF. When ON, see `src/pages/owner/OwnerBranchManagement.tsx` and `src/components/owner/branches/`.

---

## Constraints

- No UI components
- No BranchSDK direct imports from presentation
- No branch creation, editing, deletion, or persistence writes
- No Checkout, Orders, Discovery, or Search changes

---

*See [`docs/m5/PR-13-OWNER-BRANCH-MANAGEMENT-REPORT.md`](../../../docs/m5/PR-13-OWNER-BRANCH-MANAGEMENT-REPORT.md)*
