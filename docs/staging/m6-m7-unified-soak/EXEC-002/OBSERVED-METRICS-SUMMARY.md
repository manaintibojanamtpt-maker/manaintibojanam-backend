# Observed Metrics Summary — EXEC-002

**Execution ID:** BHOS-STAGING-SOAK-EXEC-002  
**Report date:** 2026-07-02  
**Rule:** Operational evidence only — CI results listed separately and **do not** satisfy staging gates

---

## 1. Staging operational metrics (observed)

| Metric | Order (M6) target | Order observed | Menu (M7) target | Menu observed |
|--------|-------------------|----------------|------------------|---------------|
| Parity match % | ≥99.9 | **N/A** | ≥99.9 | **N/A** |
| Soak health score | ≥99% | **N/A** | ≥99% | **N/A** |
| Replay success % | ≥99% | **N/A** | ≥99% | **N/A** |
| Max lag (ms) | ≤30000 | **N/A** | ≤30000 | **N/A** |
| p95 lag (ms) | — | **N/A** | — | **N/A** |
| p99 lag (ms) | — | **N/A** | — | **N/A** |
| Worker uptime % | ≥99.5 | **N/A** | ≥99% | **N/A** |
| Checkpoint age (ms) | ≤60000 | **N/A** | — | **N/A** |
| Snapshot age (ms) | — | **N/A** | ≤60000 | **N/A** |
| Outbox depth (max) | <1000 | **N/A** | — | **N/A** |
| Duplicate event % | ≤0.5 | **N/A** | — | **N/A** |
| Dropped event % | ≤0.1 | **N/A** | — | **N/A** |
| Critical drift count | — | **N/A** | 0 | **N/A** |
| Telemetry completeness % | 100% | **N/A** | 100% | **N/A** |
| prod_spine_flags_enabled_count | 0 | **N/A** (guard not deployed) | — | — |
| L1 rollback duration (s) | <60 | **N/A** | — | — |
| Soak hours continuous | ≥72 | **0** | ≥72 | **0** |

---

## 2. CI metrics (observed — NOT staging evidence)

| Metric | Observed | Timestamp | Staging gate? |
|--------|----------|-----------|---------------|
| SDK regression pass | **1033/1033** | 2026-07-02 | **No** |
| SDK regression fail | **0** | 2026-07-02 | **No** |
| Duration (ms) | **23874** | 2026-07-02 | **No** |

---

## 3. Code-level observations (NOT staging runtime)

| Observation | Result | Staging gate? |
|-------------|--------|---------------|
| EVENT_SDK_VERSION | 1.0.0 FROZEN | No |
| MENU_SDK_VERSION | 1.0.0 FROZEN | No |
| M6 spine flag defaults in code | All OFF | No |
| M7 spine flag defaults in code | All OFF | No |
| Helm staging values flags | All `"false"` | No (not deployed) |

---

## 4. Infrastructure observations

| Observation | Result |
|-------------|--------|
| GCP project `bhojanos-staging` | **No access / not provisioned** |
| terraform CLI | **Not available on execution host** |
| helm CLI | **Not available on execution host** |
| kubectl CLI | **Not available on execution host** |
| GKE cluster | **Not observed** |
| Firestore staging data | **Not observed** |

---

## 5. Health scores (observed)

| Score | Value | Basis |
|-------|-------|-------|
| Staging soak health (M6) | **N/A** | No workers |
| Staging soak health (M7) | **N/A** | No workers |
| Observability readiness | **0 / 5** | Nothing deployed |
| Rollback readiness | **0 / 5** | No timed drills |
| Production readiness (operational) | **0 / 5** | Zero soak evidence |
| Architecture (code/docs) | **5.0 / 5** | Unchanged — not operational |

---

## 6. Readiness classification (observed)

| Platform | Classification | Reason |
|----------|----------------|--------|
| M6 Event / Order projection | **NOT_READY** | 0h soak, 0 parity samples |
| M7 Menu projection | **NOT_READY** | 0h soak, 0 parity samples |
| Adapter wiring | **PROHIBITED** | No soak evidence |
| Production Stage-0 | **PROHIBITED** | NOT_READY |

---

**STOP.** Do not infer staging success from CI pass count.
