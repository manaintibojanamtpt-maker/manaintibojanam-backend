# Branch Operations Intelligence

**Version:** `0.1.0-foundation` (`BRANCH_OPERATIONS_VERSION`)  
**Status:** M5 PR-10 — pure domain operational availability  
**Flag:** `FF_BRANCH_OPERATIONS_ENABLED` (default **OFF**)

---

## Architecture

```
BranchOperationalSnapshot
        ↓
BranchOperationsEvaluator
        ↓
Hours · Capacity · Inventory · Status evaluators
        ↓
BranchAvailabilitySummary
        ↓
BranchAssignmentEngine (future consumer — not wired in PR-10)
```

**No branch selection. No scoring. No SDK. No persistence.**

---

## Evaluators

| Module | Evaluates |
|--------|-----------|
| `BranchHoursEvaluator.ts` | Operating hours (schedule or snapshot `isOpen`) |
| `BranchCapacityEvaluator.ts` | Queue load, congestion, accepting orders |
| `BranchInventoryEvaluator.ts` | Cart item coverage vs unavailable items |
| `BranchOperationsEvaluator.ts` | Orchestrates all + availability summary |

---

## Availability Summary

`BranchAvailabilitySummary` aggregates:

- `isOperationallyAvailable` — all operational checks pass
- `hours`, `capacity`, `inventory`, `operationalStatus`
- `blockers` — human-readable reasons when unavailable

When `FF_BRANCH_OPERATIONS_ENABLED` is OFF, returns disabled summary without evaluation.

---

## Constraints

- Pure domain logic only
- Deterministic outputs for same inputs
- No Checkout, Orders, Discovery, Search, SDK, Repository, or Firestore
- Does not modify Assignment Engine in PR-10

---

*See [`docs/m5/PR-10-BRANCH-OPERATIONS-INTELLIGENCE-REPORT.md`](../../../docs/m5/PR-10-BRANCH-OPERATIONS-INTELLIGENCE-REPORT.md)*
