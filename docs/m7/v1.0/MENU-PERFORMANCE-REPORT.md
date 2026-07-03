# Menu Performance Report v1.0

**Status:** Documentation posture — no benchmarks required (M7 PR-14)  
**Date:** 2026-06-27

---

## 1. Executive summary

Menu Platform v1.0 is architected for **read-heavy, low-latency catalog access** with **shadow projection** for evidence gathering. No production load benchmarks were run in M7. This document records **expected latency**, **scalability posture**, and **known limitations**.

---

## 2. Expected latency (design targets)

| Operation | Target (p95) | Notes |
|-----------|--------------|-------|
| `getMenu` (legacy) | < 150 ms | Single tenant catalog |
| `getMenuItem` | < 50 ms | Point read |
| `listCategories` | < 80 ms | Category index |
| `searchMenu` | < 200 ms | Depends on search backend |
| `validateMenu` | < 30 ms | Sync, in-memory |
| Shadow projection refresh | < 500 ms | Async; not on critical path |
| Parity comparison | < 1 s | Batch; staging only |

**Current production path:** legacy only (flags OFF). Projection path is not on the read hot path.

---

## 3. Memory profile

| Component | Expected footprint | Notes |
|-----------|-------------------|-------|
| MenuSDK instance | ~50 KB | Stateless orchestrator |
| Menu snapshot (projection) | ~1–5 MB per tenant | Catalog metadata only (PR-7) |
| Parity report | ~100 KB per run | Ephemeral |
| Soak telemetry buffer | Configurable | Default bounded window |
| Rollout policy state | ~1 KB | In-memory policy |

Full item projection (future) will increase snapshot size proportionally to menu cardinality.

---

## 4. Projection scalability

| Dimension | Posture |
|-----------|---------|
| Tenants | Horizontal — per-tenant snapshots |
| Menu items | Catalog-metadata projection scales O(categories + metadata) |
| Full item projection | Deferred — O(items) |
| Event replay | Checkpoint-based incremental refresh |
| Concurrent readers | Read-only snapshots; copy-on-write refresh |

---

## 5. Repository scalability

| Pattern | Support |
|---------|---------|
| Legacy read port | Provider-neutral abstraction |
| Connection pooling | Host responsibility |
| Caching | Not in SDK core — host may wrap |
| Pagination | `MenuQuery` supports limits |

---

## 6. Read-path scalability

```
Presentation → MenuFacade → MenuSDK → Legacy Repository
                                    ↘ (future) Adapter → Projection
```

- **Current:** single legacy path; no adapter overhead
- **Future adapter path:** routing decision + dual-read parity adds ~2× read cost during shadow phase
- **Rollout:** percentage-based routing reduces blast radius

---

## 7. Known limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| Catalog-metadata projection only | Items not in projection read model | Legacy authoritative |
| No SDK-level caching | Repeated reads hit repository | Host-level cache |
| No batch API | N+1 for multi-item reads | Future `getMenuItems` ADR |
| Search depends on external backend | Latency variable | Search platform integration |
| No production benchmarks | Unknown prod p99 | Staging soak post-ARB |

---

## 8. Future optimization roadmap

| Priority | Optimization | Trigger |
|----------|--------------|---------|
| P1 | Host-level read cache | Production activation |
| P2 | Full item projection | Firestore migration ADR |
| P3 | Batch item reads | Consumer demand |
| P4 | Projection pre-warm | High-traffic tenants |
| P5 | CDN for static menu exports | Enterprise tier |

---

**Note:** Performance benchmarks are out of scope for PR-14. Staging soak (72h) required before production activation.
