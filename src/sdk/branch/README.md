# BranchSDK

**Version:** `1.0.0` (`BRANCH_SDK_VERSION`) · **Frozen:** yes (ADR-016)  
**Status:** M5 complete — Branch Intelligence Platform v1.0 certified  
**Mission:** Branch intelligence — *"Select the best fulfillment unit for a brand"*  
**Governance:** [Branch Platform Law](../../../docs/m5/BRANCH-PLATFORM-LAW.md) · ADR-015

---

## Architectural Law

1. **A Tenant represents a Brand.**
2. **A Branch represents a Fulfillment Unit.**
3. **Customers interact with Brands.**
4. **Only BranchSDK may choose fulfillment branches.**
5. **No other platform may perform branch selection.**

---

## Architecture

```
Presentation → BranchFacade (PR-5+) → BranchSDK → BranchRepository
                                              ↓
                                    Domain (eligibility + validation)
```

---

## Module Layout

| Path | Purpose |
|------|---------|
| `contracts/BranchSDK.ts` | Public SDK interface |
| `adapters/DefaultBranchAdapter.ts` | Operational adapter (PR-4) |
| `adapters/BranchSdkOrchestrator.ts` | Repository + domain orchestration |
| `adapters/StubBranchAdapter.ts` | NOT_CONFIGURED fallback |
| `assignment/` | Automatic branch selection engine (PR-7) |
| `repository/` | Persistence abstractions (PR-3) |
| `operations/` | Operational read repository (PR-11) |
| `operations-sdk/` | Operations SDK orchestration (PR-12) |
| `validation/validateBranchQuery.ts` | Structural query validation |
| `core/featureFlags.ts` | Feature flag defaults (all OFF) |
| `createBranchSDK.ts` | Factory |

---

## Public API

| Method | PR-4 status |
|--------|-------------|
| `listBranches(filter)` | ✅ Orchestrated |
| `getBranch(branchId)` | ✅ Orchestrated |
| `findEligibleBranches(query)` | ✅ Orchestrated |
| `validateBranch(input)` | ✅ Orchestrated (sync resolver) |
| `estimateETA(input)` | ✅ Orchestrated |
| `findBestBranch(query)` | ✅ When `FF_BRANCH_ASSIGNMENT_ENABLED` ON; else `NOT_CONFIGURED` |
| `assignBranch(request)` | `NOT_CONFIGURED` |
| `overrideAssignment(request)` | `NOT_CONFIGURED` |

```typescript
import { createBranchSDK } from '@/sdk/branch/createBranchSDK';

const branch = createBranchSDK({
  featureFlags: (flag) => flag === 'FF_BRANCH_ENABLED',
  branchRepository: myRepository,
});
```

---

## Feature Flags

| Flag | Env key | Default | Purpose |
|------|---------|---------|---------|
| `FF_BRANCH_ENABLED` | `VITE_FF_BRANCH_ENABLED` | OFF | Master branch gate |
| `FF_BRANCH_REPOSITORY_ENABLED` | `VITE_FF_BRANCH_REPOSITORY_ENABLED` | OFF | Repository adapter |
| `FF_BRANCH_ASSIGNMENT_ENABLED` | `VITE_FF_BRANCH_ASSIGNMENT_ENABLED` | OFF | Automatic branch selection |
| `FF_BRANCH_DISCOVERY_ENABLED` | `VITE_FF_BRANCH_DISCOVERY_ENABLED` | OFF | Discovery multi-candidate reads |
| `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | `VITE_FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | OFF | Operations read repository |
| `FF_BRANCH_OPERATIONS_SDK_ENABLED` | `VITE_FF_BRANCH_OPERATIONS_SDK_ENABLED` | OFF | Operations SDK orchestration |

---

## Documentation

- [`docs/m5/PR-12-BRANCH-OPERATIONS-SDK-INTEGRATION-REPORT.md`](../../../docs/m5/PR-12-BRANCH-OPERATIONS-SDK-INTEGRATION-REPORT.md)
- [`docs/m5/BRANCH-PLATFORM-LAW.md`](../../../docs/m5/BRANCH-PLATFORM-LAW.md)

---

**STOP.** Await ARB approval before M5 PR-13.
