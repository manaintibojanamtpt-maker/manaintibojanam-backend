# Pricing Performance Report v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03  
**Benchmarks:** None recorded (documentation posture only)

---

## 1. Current architecture performance characteristics

| Layer | Latency expectation | Notes |
|-------|---------------------|-------|
| PricingSDK orchestration | < 5ms overhead | Validation + telemetry only when configured |
| Repository (in-memory tests) | < 1ms | Production provider TBD |
| Projection worker | Async, non-blocking | Shadow only; not on read path |
| Read adapter | < 2ms routing decision | Not wired to PricingSDK |
| Rollout evaluator | < 1ms bucket hash | Policy only |
| Certification evaluator | < 10ms evidence aggregation | In-memory fixtures |

---

## 2. Scalability assumptions

| Dimension | Assumption |
|-----------|------------|
| Tenants | Horizontal scale via tenant-scoped price lists |
| Branches | Branch overrides indexed by `branchId` |
| Price lists | Versioned; immutable snapshots for reads |
| Projection | Catalog-metadata shadow; not full price matrix |
| Caching | Provider responsibility; not in SDK v1.0 |

---

## 3. Projection isolation

- Shadow projection runs independently of PricingSDK read path
- Parity/soak/operational validation are evidence-only workloads
- No projection reads on production PricingSDK path in v1.0

---

## 4. Provider neutrality

- Repository port allows Firestore, REST, or in-memory backends
- No provider-specific optimisations in SDK core
- Performance tuning deferred to provider implementation ADR

---

## 5. Rollout thresholds (policy reference)

| Metric | Threshold | Source |
|--------|-----------|--------|
| P95 latency | ≤ 500ms | Rollout rollback (PR-12) |
| Fallback rate | ≤ 2% | Rollout + certification |
| Parity | ≥ 99% | Certification READY gate |
| Max projection lag | ≤ 30s | Certification READY gate |

---

## 6. Future performance work (out of scope v1.0)

- Load testing with realistic price list sizes
- Projection read path benchmarks post-adapter wiring ADR
- CDN / edge caching for public price lists
- Production dashboard SLOs

---

**STOP.** No benchmark changes in PR-14.
