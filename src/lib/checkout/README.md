# Checkout Branch Facade

**Version:** M5 PR-8 — checkout branch assignment integration  
**Flag:** `FF_BRANCH_CHECKOUT_ENABLED` (default **OFF**)

---

## Architecture

```
Checkout (presentation)
        ↓
CheckoutBranchFacade.resolveCheckoutBranch()
        ↓
BranchFacade.findBestBranch()
        ↓
BranchSDK.findBestBranch()
        ↓
CheckoutBranchContext (in-memory)
        ↓
Payment (unchanged)
```

**BranchSDK is the ONLY platform that chooses fulfillment branches.** Checkout orchestrates — it does not score or select.

---

## Flow

1. Validate checkout branch request (`CheckoutBranchResolveQuery`)
2. If `FF_BRANCH_CHECKOUT_ENABLED` OFF → legacy path (no assignment)
3. Build `BranchSelectionQuery` via `CheckoutBranchContext`
4. Call `BranchFacade.findBestBranch()`
5. Attach `BranchAssignment` to in-memory checkout context
6. Expose assignment summary to presentation before payment

---

## Module Layout

| File | Purpose |
|------|---------|
| `CheckoutBranchFacade.ts` | Pre-payment branch resolution orchestration |
| `CheckoutBranchContext.ts` | Query building + in-memory assignment context |
| `CheckoutBranchSession.ts` | Session pub/sub (loading, assigned, rejected) |
| `CheckoutBranchTelemetry.ts` | Checkout assignment telemetry |
| `CheckoutBranchErrorMapper.ts` | Checkout-specific error messages |

---

## Feature Flag

| Flag | Env key | Default | Effect |
|------|---------|---------|--------|
| `FF_BRANCH_CHECKOUT_ENABLED` | `VITE_FF_BRANCH_CHECKOUT_ENABLED` | OFF | Legacy checkout without branch assignment |

When OFF, `resolveCheckoutBranch` returns `{ ok: true, legacy: true }` without calling BranchSDK.

When ON, requires `FF_BRANCH_ENABLED` + `FF_BRANCH_ASSIGNMENT_ENABLED` for assignment engine.

---

## Constraints

- No Order creation or modification
- No Firestore writes (`branchId` not persisted)
- No payment processing changes
- No Discovery or Search changes
- No duplicated assignment logic

---

*See [`docs/m5/PR-8-CHECKOUT-BRANCH-INTEGRATION-REPORT.md`](../../../docs/m5/PR-8-CHECKOUT-BRANCH-INTEGRATION-REPORT.md)*
