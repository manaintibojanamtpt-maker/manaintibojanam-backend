# ADR-015: Branch Intelligence Platform Architecture

**Status:** Accepted  
**Date:** 2026-06-26  
**Deciders:** Architecture Review Board  
**Supersedes:** Informal multi-branch notes in M2 `BRANCH-DISCOVERY-FLOW.md` (interim `/t/` paths)  
**Related:** ADR-011 (SDK Strangler), ADR-014 (Search v1 Freeze), [Discovery Pipeline Contract](../m3/DISCOVERY-PIPELINE-CONTRACT.md), FEB-001

---

## Context

BhojanOS frozen platforms (Order, Reference, Location, Discovery, Marketplace, Search) serve a **single-kitchen-per-tenant** model. SDK types include `branchId`, but production sets `branchId === tenantId`. Customers use one storefront URL per brand (`/k/{slug}`).

The business requires **multi-branch intelligence**: one brand storefront, automatic nearest-branch selection, branch-aware checkout, and owner management of multiple outlets — without breaking frozen platform contracts.

M5 architecture phase (BHOS-M5) produced a complete repository audit and platform design. **No implementation** is included in this ADR.

---

## Decision

1. **Introduce** a new **Branch Intelligence Platform** as a strangler slice — parallel to Discovery and Search platforms.

2. **Public boundary:** `BranchSDK` in `src/sdk/branch/` with methods defined in `docs/m5/BRANCH-SDK-DESIGN.md`.

3. **Presentation boundary:** `BranchFacade` in `src/lib/branch/` — UI must not call BranchSDK or Firestore directly (ADR-011).

4. **Single storefront invariant:** Customer URLs remain `/k/{tenantSlug}` only. Branch slugs are internal. Branch selection is a platform capability, not a routing feature.

5. **Integration rules (immutable):**
   - **Discovery** owns cross-tenant **restaurant ranking**. May emit multiple candidates per tenant. **Must not** calculate branch scores or assign branches.
   - **BranchSDK** owns branch selection, scoring, eligibility, assignment, failover.
   - **Search** finds restaurants/brands. **Must never** select fulfilling branch.
   - **Checkout** calls BranchSDK **before payment**. Assignment is deterministic. Reassignment allowed until kitchen acceptance.
   - **Orders** gain additive `branchId` field (legacy: `branchId = tenantId`).

6. **Firestore:** New collections per `docs/m5/FIRESTORE-BRANCH-DESIGN.md`. **Separate migration ADR (ADR-016)** required before writes. No migration in architecture phase.

7. **Feature flags:** All `FF_BRANCH_*` default **OFF**. Rollback via flags + `StubBranchAdapter`.

8. **Frozen platform constraint:** No modifications to DiscoverySDK, SearchSDK, Discovery pipeline stages, or Search pipeline contracts without separate ADRs. M5 PR-6 Discovery change is **additive repository read only**.

9. **Implementation gated:** M5 PR-1 foundation may proceed after this ADR is **Accepted**.

10. **Permanent architectural law** (immutable without ARB):
    - A **Tenant** represents a **Brand**.
    - A **Branch** represents a **Fulfillment Unit**.
    - **Customers** interact with **Brands**.
    - **Only BranchSDK** may choose fulfillment branches.
    - **No other platform** may perform branch selection.

    Documented in `docs/m5/BRANCH-PLATFORM-LAW.md` and `src/sdk/branch/core/platformLaw.ts`.

---

## Consequences

### Positive

- Clear separation: brand discovery vs branch fulfillment.
- Preserves `/k/paradise` vision — branches invisible by default.
- Strangler rollout with zero production impact until flags enabled.
- Reuses LocationSDK for distance; aligns with M2 schema proposal.

### Negative / deferred

- Firestore migration complexity — tenant-as-branch backfill required.
- Order read DTO extension — requires Order domain ADR amendment.
- Dual delivery fee engines must converge (M5 PR-11).
- Owner UX complexity — mitigated by phased PR-14.
- GeoIndex deployment still required for scale.

---

## Alternatives considered

| Alternative | Rejected because |
|-------------|------------------|
| Branch slug in URL (`/k/paradise-hitech`) | Violates single-storefront vision |
| Extend DiscoverySDK with branch scoring | Violates frozen Discovery pipeline |
| Search selects branch at click time | Violates Search platform boundary |
| Embed branches in tenant doc only | Does not scale; blocks geoIndex |
| Implement in LocationSDK | Wrong bounded context |

---

## References

- `docs/m5/BRANCH-PLATFORM-LAW.md`
- `docs/m5/MULTI-BRANCH-INTELLIGENCE-PLATFORM.md`
- `docs/m5/BRANCH-SDK-DESIGN.md`
- `docs/m5/FIRESTORE-BRANCH-DESIGN.md`
- `docs/m5/MIGRATION-ROADMAP.md`
- `docs/m2/FIRESTORE-SCHEMA-PROPOSAL.md`
- `docs/m3/DISCOVERY-PIPELINE-CONTRACT.md`

---

## Compliance

| Requirement | Status |
|-------------|--------|
| No code in architecture phase | ✅ |
| No frozen SDK modification | ✅ |
| No Firestore migration | ✅ |
| FEB-001 architecture governance | ✅ Accepted |

---

## Approval

| Role | Name | Date | Decision |
|------|------|------|----------|
| Architecture Review Board | _pending_ | | |
| Founder | _pending_ | | |
