# M5 PR-1 — BranchSDK Foundation Report

**PR:** BHOS-M5-PR1  
**Date:** 2026-06-26  
**Status:** ✅ Complete — contracts + stub only

---

## 1. SDK Structure

```
src/sdk/branch/
├── adapters/
│   ├── StubBranchAdapter.ts
│   └── notConfigured.ts
├── contracts/
│   └── BranchSDK.ts
├── core/
│   ├── featureFlags.ts
│   └── platformLaw.ts
├── dto/
│   ├── assignment.ts, branch.ts, capacity.ts, eligibility.ts
│   ├── eta.ts, hours.ts, inventory.ts, queries.ts
│   ├── routing.ts, score.ts, status.ts, index.ts
├── engines/
│   └── BranchAssignmentEngine.ts
├── errors/
│   └── branchErrors.ts
├── repository/
│   ├── BranchRepository.ts
│   ├── BranchAssignmentRepository.ts
│   └── README.md
├── shared/
│   ├── constants.ts
│   └── options.ts
├── types/
│   ├── branded.ts
│   └── index.ts
├── validation/
│   └── validateBranchQuery.ts
├── createBranchSDK.ts
├── version.ts
└── README.md

src/domain/branch/README.md   (scaffolding)
```

---

## 2. Public Contracts

`BranchSDK` methods (all `NOT_CONFIGURED` via stub):

| Method | Purpose |
|--------|---------|
| `findBestBranch` | Best fulfillment branch |
| `findEligibleBranches` | Eligible branch list |
| `assignBranch` | Persist assignment |
| `overrideAssignment` | Manual override |
| `estimateETA` | Branch ETA |
| `getBranch` | Branch detail |
| `listBranches` | List brand branches |
| `validateBranch` | Serviceability validation |

---

## 3. DTO Overview

| DTO | File |
|-----|------|
| `BranchScore` | `dto/score.ts` |
| `BranchAssignment` | `dto/assignment.ts` |
| `BranchEligibility`, `BranchCandidate` | `dto/eligibility.ts` |
| `BranchCapacitySnapshot` | `dto/capacity.ts` |
| `BranchInventorySnapshot` | `dto/inventory.ts` |
| `BranchHoursSnapshot` | `dto/hours.ts` |
| `BranchLiveStatus` | `dto/status.ts` |
| `BranchRoutingPolicy` | `dto/routing.ts` |
| Query DTOs | `dto/queries.ts` |

---

## 4. Feature Flags

| Flag | Default |
|------|---------|
| `FF_BRANCH_ENABLED` | OFF |
| `FF_BRANCH_ASSIGNMENT_ENABLED` | OFF |
| `FF_BRANCH_DISCOVERY_ENABLED` | OFF |

---

## 5. Versioning

| Constant | Value |
|----------|-------|
| `BRANCH_SDK_VERSION` | `0.1.0-foundation` |
| `BRANCH_SDK_FROZEN` | `false` |
| `BRANCH_SDK_MODULE` | `branch` |

---

## 6. Testing

**File:** `src/sdk/__tests__/branchSdkFoundation.test.ts`

| Area | Coverage |
|------|----------|
| Version exports | ✅ |
| Feature flag defaults + env keys | ✅ |
| Platform law constants | ✅ |
| Factory + stub NOT_CONFIGURED | ✅ |
| DTO structural validation | ✅ |
| Repository port shapes | ✅ |

Run: `npm run test:sdk`

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental branch logic in other SDKs | Platform law in ADR-015 + `platformLaw.ts` |
| Premature Firestore coupling | No repository adapters in PR-1 |
| Flag leakage to production | All defaults OFF |

---

## 8. Rollback

- No runtime behaviour change — stub only
- Remove `src/sdk/branch/` if needed (no consumers yet)
- Flags remain OFF

---

## 9. Definition of Done

- [x] `BranchSDK` interface
- [x] `BranchRepository` + `BranchAssignmentRepository` ports
- [x] `BranchAssignmentEngine` interface
- [x] All required DTOs
- [x] Feature flags (OFF)
- [x] Version constants
- [x] Stub adapter
- [x] Factory
- [x] Tests
- [x] README + platform law doc
- [x] No Firestore / Discovery / Checkout / UI

**Await ARB approval before M5 PR-2.**

---

## Architectural Law

Permanent rules in [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

1. Tenant = Brand  
2. Branch = Fulfillment Unit  
3. Customers interact with Brands  
4. Only BranchSDK chooses branches  
5. No other platform performs branch selection
