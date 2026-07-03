# M5 PR-8 — Checkout Branch Assignment Integration Report

**PR:** BHOS-M5-PR8  
**Date:** 2026-06-26  
**Status:** ✅ Complete — first runtime checkout integration of automatic branch selection

---

## 1. Checkout Integration Architecture

```
Checkout (presentation)
        ↓
CheckoutBranchFacade.resolveCheckoutBranch()
        ↓
BranchFacade.findBestBranch()          ← added in PR-8
        ↓
BranchSDK.findBestBranch()
        ↓
CheckoutBranchContext (in-memory)
        ↓
Payment (unchanged)
```

**BranchSDK remains the ONLY platform that chooses fulfillment branches.** Checkout orchestrates resolution before payment — it does not score, rank, or select.

| Module | Path |
|--------|------|
| Facade | `src/lib/checkout/CheckoutBranchFacade.ts` |
| Context | `src/lib/checkout/CheckoutBranchContext.ts` |
| Session | `src/lib/checkout/CheckoutBranchSession.ts` |
| Telemetry | `src/lib/checkout/CheckoutBranchTelemetry.ts` |
| Error mapper | `src/lib/checkout/CheckoutBranchErrorMapper.ts` |
| Branch facade extension | `src/lib/branch/BranchFacade.ts` (`findBestBranch`) |

---

## 2. Checkout Flow

| Step | Action |
|------|--------|
| 1 | Validate `CheckoutBranchResolveQuery` |
| 2 | Gate on `FF_BRANCH_CHECKOUT_ENABLED` — OFF → legacy path (no SDK call) |
| 3 | Build `BranchSelectionFacadeQuery` via `CheckoutBranchContext` |
| 4 | Call `BranchFacade.findBestBranch()` |
| 5 | Attach `BranchAssignment` to in-memory checkout context |
| 6 | Expose `CheckoutBranchAssignmentSummary` to presentation |
| 7 | Proceed to payment (unchanged) |

No Order creation. No Firestore writes. No payment logic changes.

---

## 3. Branch Assignment Integration

- Reuses PR-7 assignment engine via `BranchSDK.findBestBranch()`
- No duplicated assignment, eligibility, or scoring logic
- Preferred branch passed through `preferredBranchId` on checkout query
- Assignment rejection surfaces as checkout-specific errors (`noEligibleBranch`, `assignmentRejected`)
- Legacy path returns `{ ok: true, legacy: true }` when checkout flag is OFF

---

## 4. Session Lifecycle

`CheckoutBranchSession` states:

| Status | Meaning |
|--------|---------|
| `idle` | No assignment attempted |
| `loading` | Resolving branch |
| `assigned` | Branch attached to context |
| `rejected` | No eligible branch / assignment not configured |
| `error` | Transient failure (retryable) |
| `legacy` | Flag OFF — tenant-only checkout |
| `retry` | Retrying last query |
| `cancelled` | User cancelled / cleared |

Pub/sub via `subscribeCheckoutBranchSession`. In-memory only — no Firestore.

---

## 5. Error Handling

`CheckoutBranchErrorMapper` maps BranchFacade errors to checkout presentation errors:

| Scenario | User-facing behaviour |
|----------|----------------------|
| Flag OFF | Legacy path (not an error) |
| No eligible branch | Rejected — suggest address/items change |
| NOT_CONFIGURED | Assignment rejected — engine not enabled |
| UNAVAILABLE | Error — retry supported |
| Invalid query | Validation error before SDK call |

---

## 6. Telemetry

`CheckoutBranchTelemetry` events (optional `onTelemetry` hook):

| Event | When |
|-------|------|
| `request` | Resolution started |
| `success` | Branch assigned |
| `failure` | Resolution failed |
| `retry` | Retry attempted |
| `cancel` | Assignment cancelled |
| `legacy` | Flag OFF legacy path |

Duration timing via `beginCheckoutBranchTelemetry` / `completeCheckoutBranchTelemetry`.

---

## 7. Testing

**File:** `src/lib/__tests__/checkoutBranchFacade.test.ts`  
**Added to:** `npm run test:sdk`

| Area | Cases |
|------|-------|
| Legacy path (flag OFF) | ✅ |
| Successful assignment | ✅ |
| No eligible branch | ✅ |
| Preferred branch | ✅ |
| Assignment rejection (NOT_CONFIGURED) | ✅ |
| Retry | ✅ |
| Cancellation | ✅ |
| Telemetry | ✅ |
| Query validation | ✅ |
| Session pub/sub | ✅ |
| BranchFacade.findBestBranch delegation | ✅ |

Mock BranchSDK only — no live Firestore.

**Result:** 414 / 414 tests pass (`npm run test:sdk`)

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Branch selection in Checkout | Delegates to BranchSDK only; no local scoring |
| Production checkout change | `FF_BRANCH_CHECKOUT_ENABLED` default OFF → legacy path |
| Order / Firestore writes | No Order module changes; no `branchId` persistence |
| Payment regression | Payment flow untouched |
| Discovery / Search drift | Zero changes to those platforms |
| Duplicate assignment logic | Reuses PR-7 engine via BranchFacade |

---

## 9. Rollback

- Set `FF_BRANCH_CHECKOUT_ENABLED` OFF → legacy tenant-only checkout
- Remove `src/lib/checkout/` module
- Revert `BranchFacade.findBestBranch` if needed (checkout flag OFF is sufficient)

No data migration required.

---

## 10. Definition of Done

- [x] `CheckoutBranchFacade.ts`
- [x] `CheckoutBranchContext.ts`
- [x] `CheckoutBranchSession.ts`
- [x] `CheckoutBranchTelemetry.ts`
- [x] `CheckoutBranchErrorMapper.ts`
- [x] README
- [x] `FF_BRANCH_CHECKOUT_ENABLED` (default OFF)
- [x] `BranchFacade.findBestBranch()` wired
- [x] Unit tests (mock BranchSDK)
- [x] No Order modification
- [x] No assignment persistence
- [x] No payment logic changes
- [x] No Discovery / Search changes

**Await ARB approval before M5 PR-9.**

---

## Architectural Law

From [`BRANCH-PLATFORM-LAW.md`](./BRANCH-PLATFORM-LAW.md):

- **Checkout** orchestrates branch resolution before payment — does not select branches
- **BranchSDK** is the sole authority for fulfillment branch selection
- **Discovery** ranks and emits candidates — does not select
- **Search** finds brands — never selects branches
