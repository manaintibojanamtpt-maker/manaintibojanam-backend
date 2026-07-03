# Branch Presentation Facade

**Version:** M5 PR-5  
**Flag:** `FF_BRANCH_ENABLED` (default **OFF**)

---

## Architecture

```
UI / Pages (future)
        ↓
BranchFacade  ← ONLY presentation entry point
        ↓
BranchSDK
        ↓
Repository + Domain
```

Presentation **must not** import BranchSDK, BranchRepository, or Firestore directly.

---

## Module Layout

| File | Purpose |
|------|---------|
| `BranchFacade.ts` | Public presentation API |
| `BranchContext.ts` | Facade query → SDK input |
| `BranchSession.ts` | In-memory session pub/sub |
| `BranchTelemetry.ts` | Request/success/failure/retry timing |
| `BranchFeatureFlags.ts` | Presentation flag reader |
| `BranchErrorMapper.ts` | SDK → user-facing errors |
| `types.ts` | Facade types |

---

## Public API

| Method | Purpose |
|--------|---------|
| `listBranches(query)` | List brand branches |
| `getBranch(query)` | Branch detail |
| `findEligibleBranches(query)` | Eligible branch candidates |
| `validateBranch(query)` | Serviceability validation |
| `estimateETA(query)` | ETA estimate |
| `findBestBranch(query)` | Branch assignment (PR-8; requires `FF_BRANCH_ASSIGNMENT_ENABLED`) |
| `getOperationalAvailability(query)` | Operational availability (PR-13 owner layer; requires `FF_BRANCH_OPERATIONS_SDK_ENABLED`) |
| `retry()` | Retry last request |
| `resetSession()` | Reset session state |
| `subscribeSession(listener)` | Session pub/sub |

**Checkout integration (PR-8):** `CheckoutBranchFacade` calls `findBestBranch` before payment — see `src/lib/checkout/`.

**Owner integration (PR-13):** `OwnerBranchFacade` delegates exclusively through this facade — see `src/lib/owner-branches/`.

**Not exposed via checkout or owner:** scoring internals, repository access.

---

## Session States

`idle` · `loading` · `success` · `empty` · `error` · `disabled` · `retry` · `cancelled`

In-memory only — no React state, no Firestore.

---

## Feature Flag

When `FF_BRANCH_ENABLED` is OFF → session status `disabled`, outcome error with `featureDisabled: true`.

---

*See [`docs/m5/PR-5-BRANCH-FACADE-REPORT.md`](../../../docs/m5/PR-5-BRANCH-FACADE-REPORT.md)*
