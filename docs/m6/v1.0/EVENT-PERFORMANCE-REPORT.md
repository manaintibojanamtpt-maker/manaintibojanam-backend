# Event Performance Report v1.0

**Status:** Documentation posture — no benchmarks required (M6 PR-14)  
**Date:** 2026-06-27

---

## 1. Executive summary

Event Platform v1.0 is architected for **durable, at-least-once event delivery** with **shadow projection** for read-model evidence. No production load benchmarks were run in M6. This document records expected latency, scalability posture, and known limitations.

---

## 2. Expected latency (design targets)

| Operation | Target (p95) | Notes |
|-----------|--------------|-------|
| `publish` (in-memory) | < 10 ms | Flag ON, dev/test |
| `publish` (outbox) | < 100 ms | Durable path |
| `subscribe` dispatch | < 50 ms | Per handler |
| Projection refresh (order) | < 500 ms | Async; not on critical path |
| Parity comparison | < 1 s | Batch; staging only |
| `replay` (dry run) | < 5 s | Admin operation |

**Current production path:** no event platform activity (all flags OFF).

---

## 3. Memory profile

| Component | Expected footprint | Notes |
|-----------|-------------------|-------|
| EventSDK instance | ~50 KB | Stateless |
| In-memory outbox | Configurable | Test/dev |
| Order projection snapshot | ~100 KB–1 MB per tenant | Shadow read model |
| Parity report | ~100 KB per run | Ephemeral |
| Soak telemetry buffer | Bounded window | Configurable |

---

## 4. Projection scalability

| Dimension | Posture |
|-----------|---------|
| Event throughput | Horizontal — partition by tenant/aggregate |
| Projection workers | Lease-based; single active per partition |
| Checkpoint recovery | Incremental replay from checkpoint |
| Order read model | Per-tenant snapshot; copy-on-write refresh |

---

## 5. Outbox scalability

| Pattern | Support |
|---------|---------|
| At-least-once delivery | Outbox + idempotency |
| Dead letter queue | Failed event records |
| Shadow publishing | Firestore adapter (PR-3); flag OFF |
| Provider neutrality | Port abstraction |

---

## 6. Known limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| All flags OFF | Zero prod event traffic | By design |
| No production benchmarks | Unknown prod p99 | Staging soak |
| Adapter not wired to OrderSDK | Legacy authoritative | Explicit wiring ADR |
| Firestore shadow optional | Not required for v1.0 | Mock adapters in tests |

---

## 7. Future optimization roadmap

| Priority | Optimization | Trigger |
|----------|--------------|---------|
| P1 | Outbox batch publish | High event volume |
| P2 | Projection pre-warm | High-traffic tenants |
| P3 | Parity sampling | Reduce soak cost |
| P4 | Multi-region outbox ADR | Global scale |

---

**Note:** Staging soak (72h) required before production flag enablement.
