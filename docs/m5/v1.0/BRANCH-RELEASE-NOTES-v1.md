# Branch Intelligence Platform — Release Notes v1.0

**Version:** 1.0.0 (certified)  
**Date:** 2026-06-26  
**Program:** M5 PR-1 through PR-15  
**Runtime:** `BRANCH_SDK_VERSION = 1.0.0` · `BRANCH_SDK_FROZEN = true` (ADR-016)

---

## Overview

Branch Intelligence Platform v1.0 delivers multi-branch fulfillment intelligence for BhojanOS behind a complete strangler boundary. One brand storefront (`/k/{slug}`) with silent branch selection, branch-aware checkout, operational visibility for owners, and additive order persistence — all gated by `FF_BRANCH_*` flags default **OFF**.

---

## What's included

### SDK & domain (PR-1 – PR-4, PR-7, PR-10 – PR-12)

- **BranchSDK** — 8-method public contract for selection, eligibility, validation, ETA, and branch reads
- **BranchRepository** — read-only port for branch documents
- **Assignment engine** — scoring and `findBestBranch` orchestration
- **Operations intelligence** — pure domain evaluators for hours, capacity, inventory
- **BranchOperationsSDK** — operational availability orchestration

### Presentation (PR-5, PR-8, PR-9, PR-13, PR-14)

- **BranchFacade** — customer/owner presentation entry to BranchSDK
- **CheckoutBranchFacade** — pre-payment branch assignment
- **OrderBranchPersistence** — additive `branchId` from checkout snapshot
- **OwnerBranchFacade** — read-only owner branch orchestration
- **Owner Branch Management UI** — `/owner/branches` read-only dashboard

### Integration (PR-6)

- **Discovery multi-branch candidates** — additive read; no branch scoring in Discovery

---

## Feature flags (all default OFF)

| Flag | Purpose |
|------|---------|
| `FF_BRANCH_ENABLED` | Master BranchSDK gate |
| `FF_BRANCH_REPOSITORY_ENABLED` | Firestore branch reads |
| `FF_BRANCH_ASSIGNMENT_ENABLED` | Automatic branch selection |
| `FF_BRANCH_DISCOVERY_ENABLED` | Multi-branch discovery candidates |
| `FF_BRANCH_OPERATIONS_REPOSITORY_ENABLED` | Operations repository reads |
| `FF_BRANCH_OPERATIONS_SDK_ENABLED` | Operations SDK |
| `FF_BRANCH_CHECKOUT_ENABLED` | Checkout assignment |
| `FF_BRANCH_ORDER_PERSISTENCE_ENABLED` | Order branch fields |
| `FF_BRANCH_OWNER_ENABLED` | Owner branch UI + facade |

---

## Architectural guarantees

- **ADR-015:** Only BranchSDK may choose fulfillment branches
- **ADR-011:** Presentation uses facades — no direct SDK/Firestore in UI
- **Frozen platforms unchanged:** Order, Reference, Location, Discovery pipeline, Search
- **Single storefront invariant:** `/k/{brandSlug}` only

---

## Not in v1.0

- Branch creation, editing, deletion (owner UI is read-only)
- Firestore branch collection migration (ADR-017 deferred)
- Branch override picker UI
- Failover routing production enablement
- Production flag rollout (pending staging soak)
- `BRANCH_SDK_VERSION = 1.0.0` runtime constant (post-ARB metadata PR)

---

## Upgrade path

1. ~~ARB approves ADR-016~~ ✅ 2026-06-26
2. 72-hour staging soak with staged flag enable
3. ~~Metadata PR: `BRANCH_SDK_VERSION = 1.0.0`, `BRANCH_SDK_FROZEN = true`~~ ✅
4. Git tag: `branch-platform-v1.0`
5. ADR-017 Firestore migration + production rollout per compatibility matrix

---

## Testing

- **505 / 505** tests pass (`npm run test:sdk`)
- **204** branch-focused tests

See [BRANCH-TEST-MATRIX.md](./BRANCH-TEST-MATRIX.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [BRANCH-PLATFORM-CERTIFICATION.md](./BRANCH-PLATFORM-CERTIFICATION.md) | Certification report |
| [BRANCH-PUBLIC-API-v1.md](./BRANCH-PUBLIC-API-v1.md) | Frozen public API |
| [BRANCH-COMPATIBILITY-MATRIX.md](./BRANCH-COMPATIBILITY-MATRIX.md) | Client + flag matrix |
| [BRANCH-ROLLBACK.md](./BRANCH-ROLLBACK.md) | Emergency rollback |
| [ADR-016](../../adr/ADR-016-branch-platform-v1-freeze.md) | v1.0 freeze ADR |

---

## Credits

M5 program: PR-1 (SDK foundation) through PR-15 (certification & freeze).

**Await ARB sign-off before promoting runtime version to 1.0.0.**
