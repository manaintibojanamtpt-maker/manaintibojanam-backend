# Menu Observability v1.0

**Status:** Frozen — M7 PR-14  
**Date:** 2026-06-27

---

## 1. Overview

Menu Platform emits structured telemetry across orchestration, projection, parity, soak, operational, adapter, rollout, and certification layers. All telemetry is **opt-in via feature flags** — default OFF produces no menu telemetry.

---

## 2. Telemetry events

### MenuSDK orchestration

| Event | When | Payload fields |
|-------|------|----------------|
| `menu_request` | Method invoked | `method`, `tenantId`, `correlationId` |
| `menu_success` | Successful read | `method`, `durationMs`, `correlationId` |
| `menu_failure` | Failed read | `method`, `errorCode`, `correlationId` |

Source: `src/sdk/menu/orchestration/MenuOrchestrationTelemetry.ts`

### Projection foundation

| Event | When |
|-------|------|
| `menu_projection_refresh_started` | Snapshot refresh begins |
| `menu_projection_refresh_completed` | Snapshot refresh succeeds |
| `menu_projection_refresh_failed` | Snapshot refresh fails |
| `menu_projection_checkpoint_updated` | Checkpoint advanced |

### Shadow projection (PR-7)

| Event | When |
|-------|------|
| `menu_catalog_projection_applied` | Catalog metadata applied |
| `menu_catalog_projection_skipped` | Flag OFF or no-op |

### Parity (PR-8)

| Event | When |
|-------|------|
| `menu_parity_check_started` | Comparison begins |
| `menu_parity_check_completed` | Comparison finished |
| `menu_parity_mismatch` | Field-level mismatch detected |

### Soak (PR-9)

| Event | When |
|-------|------|
| `menu_soak_sample_recorded` | Health sample captured |
| `menu_soak_threshold_breached` | Soak threshold exceeded |
| `menu_soak_certification_ready` | Soak criteria met |

### Operational validation (PR-10)

| Event | When |
|-------|------|
| `menu_operational_lag_detected` | Projection lag exceeds threshold |
| `menu_operational_drift_detected` | Drift between legacy and projection |
| `menu_operational_replay_completed` | Replay validation finished |

### Read adapter (PR-11)

| Event | When |
|-------|------|
| `menu_adapter_route_legacy` | Routed to legacy |
| `menu_adapter_route_projection` | Routed to projection |
| `menu_adapter_fallback` | Fallback to legacy |

### Rollout (PR-12)

| Event | When |
|-------|------|
| `menu_projection_rollout_stage_evaluated` | Stage policy evaluated |
| `menu_projection_rollout_routed` | Tenant routed by percentage |

### Switch certification (PR-13)

| Event | When |
|-------|------|
| `menu_projection_certification_evaluated` | Decision package generated |
| `menu_projection_certification_decision` | GO / CONDITIONAL / NO-GO |

---

## 3. Metrics (recommended)

| Metric | Type | Description |
|--------|------|-------------|
| `menu.request.count` | Counter | Total SDK requests by method |
| `menu.request.duration_ms` | Histogram | Request latency by method |
| `menu.request.error.count` | Counter | Errors by error code |
| `menu.projection.lag_ms` | Gauge | Projection lag |
| `menu.parity.mismatch.count` | Counter | Parity mismatches |
| `menu.soak.health.score` | Gauge | Soak health score |
| `menu.adapter.route.count` | Counter | Routes by source (legacy/projection) |
| `menu.rollout.stage` | Gauge | Current rollout stage |
| `menu.certification.decision` | Counter | Certification outcomes |

---

## 4. Health signals

| Signal | Healthy | Degraded | Critical |
|--------|---------|----------|----------|
| SDK availability | All methods respond | Search unavailable | Core reads fail |
| Projection lag | < 30 s | 30 s – 5 min | > 5 min |
| Parity match rate | > 99.9% | 99% – 99.9% | < 99% |
| Soak health score | > 0.95 | 0.80 – 0.95 | < 0.80 |
| Operational drift | None | Minor field drift | Structural drift |

---

## 5. Operational dashboards (recommended)

| Dashboard | Panels |
|-----------|--------|
| **Menu SDK Overview** | Request rate, latency p50/p95, error rate |
| **Projection Health** | Lag, refresh success, checkpoint age |
| **Parity & Soak** | Mismatch rate, soak score, threshold breaches |
| **Adapter & Rollout** | Route distribution, stage, fallback rate |
| **Certification** | Latest decision, blockers, evidence freshness |

Dashboards are **not deployed** in v1.0 — configuration deferred to production activation.

---

## 6. Correlation IDs

All menu telemetry accepts optional `correlationId` from SDK core request context.

**Propagation chain:**

```
Host request → MenuFacade → MenuSDK → Repository/Adapter
                              ↓
                    Telemetry (correlationId attached)
```

Use the same `correlationId` across parity, soak, and certification runs for incident triage.

---

## 7. Tracing strategy

| Span | Parent | Attributes |
|------|--------|------------|
| `menu.sdk.getMenu` | HTTP/request span | `tenantId`, `method` |
| `menu.repository.read` | SDK span | `source=legacy\|projection` |
| `menu.projection.refresh` | Background job | `checkpoint`, `itemCount` |
| `menu.parity.compare` | Staging job | `matchRate` |
| `menu.certification.evaluate` | Staging job | `decision` |

OpenTelemetry integration is host responsibility — SDK emits structured events only.

---

## 8. Projection monitoring

| Check | Frequency | Alert threshold |
|-------|-----------|-----------------|
| Snapshot freshness | 1 min | Age > 5 min |
| Refresh failure rate | 5 min | > 1% failures |
| Checkpoint advancement | 15 min | No advance in 30 min |
| Parity match rate | 1 hour | < 99.9% |
| Soak health | Continuous | Score < 0.80 |

---

**Default (flags OFF):** No menu telemetry emitted. Enable flags in staging to validate observability pipeline before production.
