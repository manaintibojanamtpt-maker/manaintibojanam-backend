# Branch Performance Report v1.0

**Status:** Documented — M5 PR-15  
**Date:** 2026-06-26

---

## 1. Scope

This report documents **performance posture** for Branch Intelligence Platform v1.0. No automated load benchmarks were executed as part of PR-15 certification. All branch functionality remains behind feature flags default **OFF** — zero production latency impact until rollout.

---

## 2. Expected hot paths

| Path | Layers | Expected cost drivers |
|------|--------|----------------------|
| Checkout assignment | CheckoutFacade → BranchFacade → AssignmentEngine → Repository | Repository reads × N branches; scoring CPU |
| Branch list (owner) | OwnerFacade → BranchFacade → Repository | Single list query |
| Operational availability | BranchFacade → OperationsSDK → Repository → Domain eval | Snapshot read + pure domain eval |
| Discovery candidates | Discovery → BranchCandidateResolver | Additive branch list read |
| Validation / ETA | BranchSDK → Domain | In-memory; optional geo distance |

---

## 3. Design performance characteristics

| Design choice | Performance implication |
|---------------|------------------------|
| Strangler flags OFF by default | Zero runtime cost in production today |
| Stub adapters when disabled | O(1) NOT_CONFIGURED responses |
| Domain evaluators pure functions | No I/O in business rules |
| Repository read-only v1.0 | No write amplification |
| Parallel owner insights fetch | 3 concurrent facade calls on branch select |
| Session in-memory only | No Firestore session writes |

---

## 4. Known scale considerations

| Area | Risk | Mitigation (deferred) |
|------|------|------------------------|
| Multi-branch list per tenant | Linear read cost | Firestore index + pagination (future) |
| Assignment scoring all candidates | CPU ∝ branch count | Capacity pre-filter; geo index |
| Operations snapshot aggregation | Repository fan-out | Cached snapshot documents |
| Checkout blocking on assignment | User-visible latency | Timeout + retry policy in facade |

---

## 5. Telemetry timing hooks (available)

| Module | Timing captured |
|--------|-----------------|
| `BranchTelemetry` | Facade request / SDK / total ms |
| `CheckoutBranchTelemetry` | Assignment attempt duration |
| `OwnerBranchTelemetry` | Facade delegation ms |
| `BranchOperationsTelemetry` | Repository + domain + total ms |
| Assignment engine | Injectable timing in tests |

Production dashboards not configured in v1.0.

---

## 6. Staging soak performance checklist

During 72-hour preview soak:

- [ ] Measure p95 checkout assignment latency (target: document baseline)
- [ ] Measure owner branch page load with 1 / 5 / 10 branches
- [ ] Measure operations availability fetch latency
- [ ] Verify no N+1 Firestore reads beyond designed fan-out
- [ ] Compare flag OFF vs ON checkout completion time

---

## 7. v1.0 certification verdict

| Criterion | Status |
|-----------|--------|
| Automated perf benchmarks | ⬜ Not in scope |
| Perf regression in test suite | ✅ N/A (flags OFF) |
| Perf telemetry hooks present | ✅ |
| Staging baseline recorded | ⬜ Pending soak |

**Accepted for v1.0 freeze:** performance validation deferred to staging soak; no production impact while flags OFF.

---

## References

- [BRANCH-OBSERVABILITY.md](./BRANCH-OBSERVABILITY.md)
- [BRANCH-PLATFORM-CERTIFICATION.md](./BRANCH-PLATFORM-CERTIFICATION.md)
