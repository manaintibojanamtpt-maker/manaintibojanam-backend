# BranchSDK — Adapters

**Version:** M5 PR-4 — orchestration layer  
**Flag:** `FF_BRANCH_ENABLED` (default **OFF**)

---

## Architecture

```
Presentation (PR-5+)
        ↓
BranchSDK contract
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

## Module Layout

| File | Purpose |
|------|---------|
| `DefaultBranchAdapter.ts` | Operational SDK implementation |
| `BranchSdkOrchestrator.ts` | Repository + domain orchestration |
| `BranchDomainMapper.ts` | Domain ↔ SDK DTO mapping |
| `BranchErrorMapper.ts` | Error normalization |
| `BranchTelemetry.ts` | Orchestration telemetry hooks |
| `StubBranchAdapter.ts` | NOT_CONFIGURED fallback |

---

## Orchestrated Methods

| Method | Repository | Domain |
|--------|------------|--------|
| `listBranches` | ✅ | — |
| `getBranch` | ✅ | — |
| `findEligibleBranches` | ✅ | eligibility filter |
| `validateBranch` | sync resolver | validation |
| `estimateETA` | ✅ | eligibility gate |

**NOT_CONFIGURED (PR-4):** `assignBranch`, `overrideAssignment`  
**Flag-gated (PR-7):** `findBestBranch` when `FF_BRANCH_ASSIGNMENT_ENABLED` OFF

---

## Constraints

- No assignment engine
- No branch scoring or best-branch selection
- No Discovery / Checkout / Search integration
- No Firestore queries in adapter layer

---

*See [`docs/m5/PR-4-BRANCH-SDK-ORCHESTRATION-REPORT.md`](../../../../docs/m5/PR-4-BRANCH-SDK-ORCHESTRATION-REPORT.md)*
