# ADR-016: Branch Intelligence Platform v1.0 Freeze

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** N/A (first stable Branch Platform release)  
**Related:** ADR-011 (SDK Strangler), ADR-015 (Branch Platform Architecture), ADR-017 (Firestore migration), FEB-001, BHOS-M5

**Note:** ADR-015 referenced a future Firestore migration ADR. Firestore branch collection migration is **deferred to ADR-017** — this ADR covers platform contract freeze only.

---

## Context

BhojanOS M5 (Branch Intelligence Platform) delivered PR-1 through PR-14:

- BranchSDK with selection, eligibility, validation, ETA, and branch reads
- BranchRepository read port and operations repository
- Assignment engine with scoring
- BranchOperationsSDK for operational availability
- BranchFacade, CheckoutBranchFacade, OwnerBranchFacade presentation boundaries
- Checkout assignment integration and order branch persistence
- Discovery multi-branch candidate reads (additive)
- Owner branch management UI (read-only)

All functionality ships behind `FF_BRANCH_*` feature flags defaulting **OFF**. M5 PR-15 certifies the platform for v1.0.0 without runtime code changes.

External consumers (Checkout, Owner UI, future npm package, server adapters) require a stable contract: method signatures, DTOs, repository ports, and error codes must not change without governance.

---

## Decision

1. **Freeze** Branch Intelligence Platform at version **1.0.0** effective upon ARB acceptance of this ADR.

2. **Frozen public surface — `BranchSDK`:**
   - `findBestBranch(query: BranchSelectionQuery)`
   - `findEligibleBranches(query: BranchEligibilityQuery)`
   - `assignBranch(request: BranchAssignmentRequest)`
   - `overrideAssignment(request: BranchOverrideRequest)`
   - `estimateETA(input: BranchETAInput)`
   - `getBranch(branchId: BranchId)`
   - `listBranches(filter: BranchListFilter)`
   - `validateBranch(input: BranchValidationInput)`
   - `createBranchSDK(options?)`

3. **Frozen operations surface — `BranchOperationsSDK`:**
   - `getOperationalAvailability(query)`
   - `getOperationalSnapshot(branchId)`
   - `createBranchOperationsSdk(options?)`

4. **Frozen repository ports:**
   - `BranchRepository` — `src/sdk/branch/repository/BranchRepository.ts`
   - `BranchOperationsRepository` — operations read port (PR-11)

5. **Frozen presentation surfaces:**
   - `BranchFacade` — `src/lib/branch/BranchFacade.ts`
   - `CheckoutBranchFacade` — `src/lib/checkout/CheckoutBranchFacade.ts`
   - `OwnerBranchFacade` — `src/lib/owner-branches/OwnerBranchFacade.ts`
   - `OrderBranchPersistence` — `src/lib/orders/OrderBranchPersistence.ts`

6. **Frozen architectural law:** [BRANCH-PLATFORM-LAW.md](../m5/BRANCH-PLATFORM-LAW.md) — immutable without ARB

7. **Version constants (M5 metadata PR — post-ARB 2026-06-26):**
   - `BRANCH_SDK_VERSION = '1.0.0'` ✅
   - `BRANCH_SDK_FROZEN = true` ✅
   - Git tag: `branch-platform-v1.0` (pending)

8. **Explicit exclusions from v1.0:**
   - Branch CRUD / owner write operations
   - Firestore branch collection migration (ADR-017)
   - Branch override picker UI
   - Production feature flag enablement
   - Performance benchmarks and prod dashboards

9. **No runtime behaviour changes in PR-15** — documentation, validation, and certification only.

---

## Consequences

### Positive

- Checkout, Owner UI, and future clients depend on stable branch contracts.
- Breaking changes require ADR + major version bump.
- Clear rollback via feature flags and `StubBranchAdapter`.
- Discovery, Search, Order platforms remain independently frozen.

### Negative / deferred

- ~~Runtime version constant remains `0.1.0-foundation` until post-ADR metadata PR.~~ **Resolved:** `1.0.0` promoted 2026-06-26.
- Firestore branch collections not production-live — ADR-017 required.
- Production flag rollout requires 72h staging soak (conditional certification).
- Branch creation/editing/deletion deferred to v2+.
- Dual delivery fee engine convergence deferred.

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Freeze at `0.1.0-foundation` | No clear consumer version signal |
| Merge Branch into DiscoverySDK | Violates ADR-015 — Discovery must not select branches |
| Enable flags on certification | Zero-impact default required for safe rollout |
| Include Firestore migration in v1 freeze | Scope creep; separate ADR required |

---

## References

- `docs/m5/v1.0/` — full certification pack
- `docs/m5/PR-1` … `PR-14` — implementation reports
- `docs/m5/MULTI-BRANCH-INTELLIGENCE-PLATFORM.md` — master architecture
- `docs/m5/BRANCH-PLATFORM-LAW.md` — permanent law
- `src/sdk/branch/contracts/BranchSDK.ts` — contract source
- Test verification: 505/505 `npm run test:sdk` (2026-06-26)

---

## Compliance

| Requirement | Status |
|-------------|--------|
| ADR-011 SDK strangler | ✅ |
| ADR-015 platform law | ✅ |
| Discovery/Search not modified | ✅ |
| Feature flags OFF default | ✅ |
| FEB-001 architecture freeze | ✅ ARB approved 2026-06-26 |
| No implementation in freeze PR | ✅ PR-15 docs only |

---

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Architecture Review Board | BhojanOS ARB | 2026-06-26 | **APPROVED** — Certified |
| Founder | _signed_ | 2026-06-26 | **APPROVED** |
