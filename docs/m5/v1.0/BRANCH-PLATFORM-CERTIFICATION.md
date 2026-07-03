# Branch Intelligence Platform v1.0 — Certification Report

**PR:** BHOS-M5-PR15  
**Date:** 2026-06-26  
**Certification version:** 1.0.0  
**Runtime scaffold:** `BRANCH_SDK_VERSION = 0.1.0-foundation` · `BRANCH_SDK_FROZEN = false` (freeze metadata pending ARB)  
**Status:** ✅ **CERTIFIED** — ARB approved 2026-06-26  
**Certification version:** 1.0.0  
**Runtime:** `BRANCH_SDK_VERSION = 1.0.0` · `BRANCH_SDK_FROZEN = true`  
**Production readiness:** **CONDITIONAL GO** — staging soak + ADR-017 before flag rollout

**Governance:** ADR-011 · ADR-015 · ADR-016 (proposed) · FEB-001 · [BRANCH-PLATFORM-LAW.md](../BRANCH-PLATFORM-LAW.md)

---

## 1. Executive Summary

The BhojanOS Branch Intelligence Platform (M5 PR-1 through PR-14) is **architecturally complete** and **certified for v1.0.0** as a strangler slice behind feature flags. All `FF_BRANCH_*` flags default **OFF** — zero production behaviour change until explicit rollout.

| Dimension | Score | Notes |
|-----------|-------|-------|
| Architecture compliance | 5.0 / 5 | ADR-015 law enforced; layering frozen |
| Implementation completeness | 5.0 / 5 | PR-1…PR-14 delivered |
| Automated test coverage | 4.5 / 5 | 204 branch-focused tests; 505/505 suite pass |
| Observability | 4.0 / 5 | Facade/SDK telemetry; no prod dashboards |
| Production readiness | 3.5 / 5 | Flags OFF; Firestore migration deferred; staging soak not recorded |

**Platform Maturity Score: 4.4 / 5 (88%)**  
**Architecture Score: 5.0 / 5**

**Certification Verdict: CONDITIONAL GO**

Approve v1.0 documentation freeze (ADR-016). Defer production flag enablement and version constant promotion until 72-hour staging validation and ARB sign-off.

---

## 2. Certification Results

### Component review

| Component | Verified | Evidence |
|-----------|----------|----------|
| **BranchSDK** | ✅ | `BranchSDK` contract — 8 public methods |
| **Assignment Engine** | ✅ | `createBranchAssignmentEngine` + `FF_BRANCH_ASSIGNMENT_ENABLED` |
| **Operations SDK** | ✅ | `BranchOperationsSDK` — availability + snapshot |
| **Repository** | ✅ | `BranchRepository` read port frozen |
| **Presentation (BranchFacade)** | ✅ | 8 facade operations + session/retry |
| **Checkout integration** | ✅ | `CheckoutBranchFacade` → `findBestBranch` |
| **Order persistence** | ✅ | `OrderBranchPersistence` — snapshot only |
| **Discovery integration** | ✅ | Additive multi-candidate read; no scoring |
| **Owner platform** | ✅ | `OwnerBranchFacade` + read-only UI |
| **Feature flags** | ✅ | All `FF_BRANCH_*` default OFF |
| **Rollback strategy** | ✅ | [BRANCH-ROLLBACK.md](./BRANCH-ROLLBACK.md) |
| **Testing** | ✅ | [BRANCH-TEST-MATRIX.md](./BRANCH-TEST-MATRIX.md) |
| **Architecture compliance** | ✅ | ADR-015 · ADR-011 |

### Quality gates

| Gate | Status |
|------|--------|
| All `FF_BRANCH_*` flags default OFF | ✅ |
| No breaking API in certification PR | ✅ (docs only) |
| Repository contracts frozen | ✅ |
| Assignment contract frozen | ✅ |
| Operations contract frozen | ✅ |
| Presentation contracts frozen | ✅ |
| ADR-015 compliance | ✅ |
| ADR-011 compliance | ✅ |
| Test suite status | ✅ 505/505 pass |
| Rollback completeness | ✅ |
| Documentation completeness | ✅ v1.0 pack |

---

## 3. Compatibility Matrix

See [BRANCH-COMPATIBILITY-MATRIX.md](./BRANCH-COMPATIBILITY-MATRIX.md).

Summary: frozen platforms (Order, Reference, Location, Discovery, Search) unchanged. Legacy `branchId === tenantId` preserved when flags OFF.

---

## 4. Architecture Compliance

### Verified stack (frozen)

```
Customer / Owner UI
    → BranchFacade / OwnerBranchFacade / CheckoutBranchFacade
    → BranchSDK (DefaultBranchAdapter | StubBranchAdapter)
    → BranchRepository (Firestore | Stub)
    → Domain (eligibility, scoring, operations evaluators)
    → BranchOperationsSDK → BranchOperationsRepository
```

### ADR-015 permanent law

| Law | Status |
|-----|--------|
| Tenant = Brand | ✅ |
| Branch = Fulfillment Unit | ✅ |
| Customers interact with Brands | ✅ |
| Only BranchSDK chooses branches | ✅ |
| Discovery ranks — never assigns | ✅ |
| Search finds brands — never selects branches | ✅ |
| Checkout calls BranchFacade before payment | ✅ |
| Orders store `branchId` — never compute it | ✅ |

### ADR-011 presentation strangler

| Rule | Status |
|------|--------|
| UI must not import BranchSDK | ✅ Owner UI verified |
| UI must not import Firestore directly | ✅ `lint:presentation` guard |
| Presentation via facades only | ✅ |

---

## 5. Testing Summary

| Suite | Result |
|-------|--------|
| `npm run test:sdk` (full) | **505 / 505 pass** (2026-06-26) |
| Branch-focused subset | **204 / 204 pass** |

See [BRANCH-TEST-MATRIX.md](./BRANCH-TEST-MATRIX.md) for per-module coverage.

---

## 6. Performance Summary

No automated load benchmarks in v1.0 certification scope. See [BRANCH-PERFORMANCE-REPORT.md](./BRANCH-PERFORMANCE-REPORT.md).

**Accepted for v1.0:** strangler flags OFF; performance validation deferred to staging soak.

---

## 7. Observability

Facade and SDK telemetry documented in [BRANCH-OBSERVABILITY.md](./BRANCH-OBSERVABILITY.md).

Layers: BranchTelemetry · CheckoutBranchTelemetry · OwnerBranchTelemetry · BranchOperationsTelemetry · Assignment engine timing hooks.

---

## 8. Rollback Strategy

Three-tier rollback (L1 flags · L2 partial · L3 deploy) documented in [BRANCH-ROLLBACK.md](./BRANCH-ROLLBACK.md).

**L1 default:** set all `VITE_FF_BRANCH_*` to `false` → Stub adapters + legacy checkout/orders path.

---

## 9. Risks

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Partial flag rollout misconfiguration | High | Medium | Compatibility matrix + staged enable order |
| Firestore migration not deployed | High | High | Repository flag OFF; separate ADR-017 |
| Assignment engine regression at scale | Medium | Low | Flag OFF default; assignment tests |
| Dual delivery fee engines | Medium | Medium | Documented in ADR-015; convergence deferred |
| Breaking change without ADR | High | Low | ADR-016 freeze + `BRANCH_SDK_FROZEN` post-approval |
| Owner UI exposed prematurely | Low | Low | `FF_BRANCH_OWNER_ENABLED` OFF + nav gated |

---

## 10. Production Readiness

| Criterion | Status |
|-----------|--------|
| Code complete (PR-1…PR-14) | ✅ |
| All flags default OFF | ✅ |
| Automated tests green | ✅ |
| v1.0 documentation pack | ✅ |
| 72h staging soak | ⬜ Pending |
| Firestore branch collections live | ⬜ Pending ADR-017 |
| Version constants promoted | ⬜ Post-ARB metadata PR |
| Git tag `branch-platform-v1.0` | ⬜ Post-ARB |

**Production Readiness Score: 3.5 / 5** — safe to merge certification docs; **not** ready for production flag rollout.

---

## 11. Version Freeze Recommendation

**Current runtime (unchanged in PR-15):**

```typescript
// src/sdk/branch/version.ts
BRANCH_SDK_VERSION = '0.1.0-foundation'
BRANCH_SDK_FROZEN = false
```

**Post-ARB metadata PR (not this PR):**

```typescript
BRANCH_SDK_VERSION = '1.0.0'
BRANCH_SDK_FROZEN = true
```

**Git tag:** `branch-platform-v1.0`

Public API reference: [BRANCH-PUBLIC-API-v1.md](./BRANCH-PUBLIC-API-v1.md)

---

## 12. Definition of Done

- [x] M5 PR-1…PR-14 implementation reports complete
- [x] v1.0 documentation pack generated (PR-15)
- [x] ADR-016 Branch Platform v1 freeze drafted
- [x] `npm run test:sdk` — 505/505 pass (2026-06-26)
- [x] No runtime behaviour changes in PR-15
- [x] No SDK / UI / repository / Firestore code changes
- [ ] 72h staging soak with flags enabled (preview env)
- [x] ADR-016 Branch Platform v1 freeze **Accepted** (2026-06-26)
- [x] Set `BRANCH_SDK_VERSION = 1.0.0` + `BRANCH_SDK_FROZEN = true` (metadata PR)
- [ ] Git tag `branch-platform-v1.0`
- [ ] ADR-017 Firestore migration accepted
- [ ] Production flag rollout plan approved by ARB

---

## Go / No-Go

| Decision | Verdict | Rationale |
|----------|---------|-----------|
| Architecture freeze | **GO** | Contracts stable; ADR-015 law enforced |
| v1.0 certification (docs) | **GO** — ARB approved 2026-06-26 |
| Version constant promotion | **GO** — `1.0.0` / `true` |
| Production flag enable | **NO-GO** | Pending staging soak + ADR-017 |

### Post-certification actions

1. **72-hour staging soak** — enable flags in preview per [BRANCH-ROLLBACK.md](./BRANCH-ROLLBACK.md) enable order
2. **Git tag:** `branch-platform-v1.0` (pending)
3. **ADR-017** — Firestore branch migration approval + execution
4. **Controlled production rollout** — per [BRANCH-COMPATIBILITY-MATRIX.md](./BRANCH-COMPATIBILITY-MATRIX.md)

---

## References

- [BRANCH-PUBLIC-API-v1.md](./BRANCH-PUBLIC-API-v1.md)
- [BRANCH-COMPATIBILITY-MATRIX.md](./BRANCH-COMPATIBILITY-MATRIX.md)
- [BRANCH-TEST-MATRIX.md](./BRANCH-TEST-MATRIX.md)
- [BRANCH-RELEASE-NOTES-v1.md](./BRANCH-RELEASE-NOTES-v1.md)
- [ADR-016 Branch Platform v1 Freeze](../../adr/ADR-016-branch-platform-v1-freeze.md)
- M5 PR reports: `docs/m5/PR-1` … `PR-14`
