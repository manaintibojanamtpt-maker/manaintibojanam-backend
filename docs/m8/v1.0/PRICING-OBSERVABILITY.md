# Pricing Observability v1.0

**Status:** Frozen — M8 PR-14  
**Date:** 2026-07-03

---

## 1. Overview

Pricing Platform emits structured telemetry across orchestration, projection, parity, soak, operational, adapter, rollout, and certification layers. All telemetry is **opt-in via feature flags** — default OFF produces no pricing telemetry.

---

## 2. Telemetry events

### PricingSDK orchestration

| Event | When | Payload fields |
|-------|------|----------------|
| `pricing_request_started` | Method invoked | `method`, `tenantId` |
| `pricing_request_completed` | Successful read | `method`, `durationMs` |
| `pricing_request_failed` | Failed read | `method`, `errorCode` |

Source: `src/sdk/pricing/orchestration/PricingOrchestrationTelemetry.ts`

### Projection foundation (PR-6)

| Event | When |
|-------|------|
| `pricing_projection_refresh_started` | Snapshot refresh begins |
| `pricing_projection_refresh_completed` | Snapshot refresh succeeds |
| `pricing_projection_refresh_failed` | Snapshot refresh fails |

### Shadow projection (PR-7)

| Event | When |
|-------|------|
| `pricing_catalog_projection_applied` | Catalog metadata applied |
| `pricing_catalog_projection_skipped` | Flag OFF or no-op |

### Parity (PR-8)

| Event | When |
|-------|------|
| `pricing_parity_check_started` | Comparison begins |
| `pricing_parity_check_completed` | Comparison finished |
| `pricing_parity_mismatch` | Field-level mismatch detected |

### Soak (PR-9)

| Event | When |
|-------|------|
| `pricing_soak_sample_recorded` | Health sample captured |
| `pricing_soak_threshold_breached` | Soak threshold exceeded |
| `pricing_soak_certification_ready` | Soak criteria met |

### Operational validation (PR-10)

| Event | When |
|-------|------|
| `pricing_operational_lag_detected` | Projection lag exceeds threshold |
| `pricing_operational_drift_detected` | Drift between legacy and projection |
| `pricing_operational_replay_completed` | Replay validation finished |

### Read adapter (PR-11)

| Event | When |
|-------|------|
| `pricing_adapter_started` | Read begins |
| `pricing_adapter_completed` | Read finished |
| `pricing_adapter_failed` | Validation or failure |
| `pricing_adapter_projection_selected` | Projection path chosen |
| `pricing_adapter_legacy_selected` | Legacy path chosen |
| `pricing_adapter_fallback` | Fallback triggered |

### Rollout (PR-12)

| Event | When |
|-------|------|
| `pricing_projection_rollout_started` | Evaluation begins |
| `pricing_projection_rollout_completed` | Evaluation finished |
| `pricing_projection_rollout_stage_changed` | Stage transition |
| `pricing_projection_rollout_promoted` | Manual promotion |
| `pricing_projection_rollout_blocked` | Promotion blocked |
| `pricing_projection_rollout_fallback` | Rollback fallback |

### Switch certification (PR-13)

| Event | When |
|-------|------|
| `pricing_projection_certification_started` | Certification begins |
| `pricing_projection_certification_completed` | Certification finished |
| `pricing_projection_certification_failed` | Step failure |
| `pricing_projection_certification_ready` | Status READY |
| `pricing_projection_certification_not_ready` | Status NOT_READY |

### PricingFacade (PR-5)

| Event | When |
|-------|------|
| `pricing_facade_request` | Facade operation invoked |
| `pricing_facade_success` | Operation succeeded |
| `pricing_facade_error` | Operation failed |

---

## 3. Metrics

| Metric | Source | Purpose |
|--------|--------|---------|
| `totalRequests` | Rollout metrics | Routing volume |
| `fallbackRate` | Rollout / adapter | Rollback triggers |
| `parityPercent` | Parity reports | Certification evidence |
| `p95LatencyMs` | Operational health | Rollback threshold |
| `promotionCount` | Rollout | Stage changes |
| `rollbackCount` | Rollout | Automatic rollbacks |

---

## 4. Tracing

- Correlation via `tenantId` + `priceListId` in query DTOs
- No distributed tracing SDK in v1.0 — provider hooks via telemetry callbacks
- Facade session snapshot for presentation debugging

---

## 5. Dashboard recommendations (future)

| Dashboard | Panels |
|-----------|--------|
| Pricing SDK health | Request rate, error rate, latency p50/p95 |
| Projection evidence | Parity %, soak hours, operational health |
| Adapter (staging) | Legacy vs projection split, fallback rate |
| Certification | Latest GO/NO-GO, blockers, warnings |

---

**STOP.** No observability runtime changes in PR-14.
