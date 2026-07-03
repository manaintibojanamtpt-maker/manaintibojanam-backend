# M5 PR-10 — Branch Operations Intelligence Report

**PR:** BHOS-M5-PR10  
**Date:** 2026-06-26  
**Status:** ✅ Complete — pure domain operational availability layer

---

## 1. Operations Architecture

```
BranchOperationalSnapshot
        ↓
BranchOperationsEvaluator
        ↓
BranchHoursEvaluator
BranchCapacityEvaluator
BranchInventoryEvaluator
Operational Status check
        ↓
BranchAvailabilitySummary
        ↓
BranchAssignmentEngine (future consumer — not wired in PR-10)
```

**Pure domain only. No branch selection. No scoring. No SDK. No persistence.**

| Module | Path |
|--------|------|
| Orchestrator | `src/domain/branch/operations/BranchOperationsEvaluator.ts` |
| Hours | `src/domain/branch/operations/BranchHoursEvaluator.ts` |
| Capacity | `src/domain/branch/operations/BranchCapacityEvaluator.ts` |
| Inventory | `src/domain/branch/operations/BranchInventoryEvaluator.ts` |
| Summary types | `src/domain/branch/operations/BranchAvailabilitySummary.ts` |
| Metadata | `src/domain/branch/operations/BranchOperationsMetadata.ts` |

---

## 2. Availability Flow

| Step | Evaluator | Output |
|------|-----------|--------|
| 1 | Flag gate | OFF → disabled summary |
| 2 | Operational status | `active` / suspended / closed |
| 3 | Hours | `open` / `closed` (schedule or snapshot) |
| 4 | Capacity | `available` / `limited` / `full` |
| 5 | Inventory | `complete` / `partial` / `unavailable` |
| 6 | Summary | `isOperationallyAvailable` + `blockers[]` |

---

## 3. Hours Evaluation

- Uses optional `weeklyHours` schedule with UTC day/minute resolution
- Falls back to snapshot `isOpen` when no schedule provided
- Supports overnight windows (close < open wraps midnight)
- Closed outside schedule → `BRANCH_CLOSED` blocker

---

## 4. Capacity Evaluation

| Status | Conditions |
|--------|------------|
| `full` | Not accepting orders, queue at max, or critical congestion |
| `limited` | Busy flag, medium/high congestion, or utilization ≥ 80% |
| `available` | Accepting orders with headroom |

Reuses `isCongestionBlocking` from eligibility rules.

---

## 5. Inventory Evaluation

| Status | Conditions |
|--------|------------|
| `complete` | All cart items available |
| `partial` | Partial coverage allowed, some items missing |
| `unavailable` | Full coverage required with gaps, or all items missing |
| `not_applicable` | Empty cart |

Reuses `hasInventoryCoverage` from eligibility rules.

---

## 6. Availability Summary

`BranchAvailabilitySummary` fields:

- `isOperationallyAvailable` — status active + hours open + capacity available + inventory sufficient
- `blockers` — aggregated reasons from failed checks
- Per-dimension evaluations with structured status enums
- `BranchOperationsMetadata` for versioned operational snapshots

---

## 7. Testing

**File:** `src/domain/branch/__tests__/branchOperations.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Flag OFF → disabled | ✅ |
| Open / closed hours | ✅ |
| Weekly schedule | ✅ |
| Capacity available / limited / full | ✅ |
| Inventory complete / partial / unavailable | ✅ |
| Availability summary | ✅ |
| Suspended branch | ✅ |
| Operations metadata | ✅ |
| Deterministic outputs | ✅ |

Mock snapshots only — no external dependencies.

**Result:** 445 / 445 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental branch selection | No selection or scoring logic |
| Assignment engine regression | Assignment engine untouched |
| Production behaviour change | `FF_BRANCH_OPERATIONS_ENABLED` default OFF; no runtime consumers |
| Checkout / Orders impact | Zero changes |
| Discovery / Search drift | Zero changes |
| Duplicated eligibility logic | Reuses existing eligibility rule helpers |

---

## 9. Rollback

- Set `FF_BRANCH_OPERATIONS_ENABLED` OFF → disabled summary (current behaviour)
- Remove `src/domain/branch/operations/` module

No data migration required.

---

## 10. Definition of Done

- [x] `BranchOperationsEvaluator.ts`
- [x] `BranchHoursEvaluator.ts`
- [x] `BranchCapacityEvaluator.ts`
- [x] `BranchInventoryEvaluator.ts`
- [x] `BranchAvailabilitySummary.ts`
- [x] `BranchOperationsMetadata.ts`
- [x] README
- [x] `FF_BRANCH_OPERATIONS_ENABLED` (default OFF)
- [x] Unit tests (mock snapshots)
- [x] No Assignment Engine modification
- [x] No Checkout / Orders / Discovery / Search changes
- [x] No SDK / Repository / Firestore

**Await ARB approval before M5 PR-11.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **Operations intelligence** evaluates availability — does not select branches
- **BranchSDK / Assignment Engine** consumes operational signals — does not compute them in PR-10
- **Pure domain** — deterministic, side-effect free
