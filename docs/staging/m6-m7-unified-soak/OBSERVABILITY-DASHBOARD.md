# Staging Observability Dashboard Specification

**Program ID:** BHOS-STAGING-SOAK-001  
**Environment:** STAGING ONLY  
**Status:** Specification — deploy before Phase A bootstrap  
**Generated:** 2026-06-27

---

## 1. Dashboard overview

| Dashboard | Audience | Refresh | Priority |
|-----------|----------|---------|----------|
| **Spine Overview** | ARB, Architect | 1 min | P0 |
| **Order Projection Health** | Platform Ops | 30s | P0 |
| **Menu Projection Health** | Platform Ops | 30s | P0 |
| **Parity & Soak** | Platform Ops | 5 min | P0 |
| **Replay & Lag** | SRE | 1 min | P1 |
| **Errors & Certification** | Architect | 5 min | P1 |

---

## 2. Dashboard: Spine Overview

### Panels

| Panel | Metric | Alert |
|-------|--------|-------|
| Flags enabled count | Event + Menu flags ON | ≠ expected during soak |
| Production flag guard | Prod env flag state | ANY ON → **CRITICAL** |
| Overall health score | Composite GREEN/AMBER/RED | RED → page |
| Soak elapsed hours | Timer since T+0 | — |
| Test suite baseline | 1033/1033 | Informational |

---

## 3. Dashboard: Order Projection Health

| Panel | Metric | GREEN | AMBER | RED |
|-------|--------|-------|-------|-----|
| Worker uptime | `projection.worker.uptime_pct` | ≥ 99.5 | 99–99.5 | < 99 |
| Checkpoint age | `projection.checkpoint.age_ms` | ≤ 60k | 60k–300k | > 300k |
| Throughput | `projection.throughput_per_min` | ≥ 10 | 5–10 | < 5 |
| Error rate | `projection.error.rate` | < 0.1% | 0.1–1% | > 1% |
| Events processed | `order.projection.events.count` | Trend up | Flat 1h | Zero 15m |
| CPU / Memory | Container metrics | < 70% | 70–90% | > 90% |

**Events to watch:**
- `projection_worker_started`
- `projection_checkpoint_updated`
- `order_projection_applied`
- `order_parity_mismatch`

---

## 4. Dashboard: Menu Projection Health

| Panel | Metric | GREEN | AMBER | RED |
|-------|--------|-------|-------|-----|
| Refresh success | `menu.projection.refresh.success_rate` | 100% | 95–99% | < 95% |
| Snapshot age | `menu.projection.snapshot.age_ms` | ≤ 60k | 60k–300k | > 300k |
| Category count delta | vs legacy sample | 0 | 1–2 | > 2 |
| Worker uptime | `menu.projection.uptime_pct` | ≥ 99 | 95–99 | < 95 |

**Events to watch:**
- `menu_projection_refresh_completed`
- `menu_catalog_projection_applied`
- `menu_parity_mismatch`

---

## 5. Dashboard: Parity & Soak

| Panel | Metric | Target |
|-------|--------|--------|
| Order parity % | Rolling 4h avg | ≥ 99.9% |
| Menu parity % | Rolling 4h avg | ≥ 99.9% |
| Order soak health score | Continuous | ≥ 0.95 |
| Menu soak health score | Continuous | ≥ 0.95 |
| Mismatch rate by field | Top 10 | Trend down |
| Critical parity outcomes | Count | 0 |

---

## 6. Dashboard: Replay & Lag

| Panel | Metric | Target |
|-------|--------|--------|
| Max lag (Order) | Gauge | ≤ 30s |
| Max lag (Menu) | Gauge | ≤ 30s |
| p95 latency (Order) | Histogram | ≤ 500ms |
| p99 latency (Order) | Histogram | ≤ 1000ms |
| Replay success % | Counter ratio | ≥ 99% |
| Duplicate event % | Counter ratio | ≤ 0.5% |
| Dropped event % | Counter ratio | ≤ 0.1% |
| Outbox depth | Gauge | < 1000 |

---

## 7. Dashboard: Errors & Certification

| Panel | Metric | Notes |
|-------|--------|-------|
| Error rate by code | Breakdown | Top 20 |
| DLQ depth | Gauge | Alert > 100 |
| Certification decision | Latest | GO/CONDITIONAL/NO-GO |
| Rollback events | Counter | Any → review |
| Telemetry completeness | % spans with correlationId | 100% |

---

## 8. Alert routing (staging only)

| Severity | Channel | Response SLA |
|----------|---------|--------------|
| CRITICAL (prod flag ON) | Pager + Architect | Immediate |
| RED (soak gate) | Platform Ops Slack | 15 min |
| AMBER | Staging soak channel | 1 hour |
| INFO | Daily digest | Next standup |

---

## 9. Log queries (examples)

```
# Order parity mismatches
service:staging AND event:order_parity_mismatch

# Projection lag breach
service:staging AND metric:projection.lag_ms > 30000

# Menu critical drift
service:staging AND event:menu_operational_drift_detected AND severity:critical
```

---

## 10. Deployment checklist

- [ ] Dashboards created in staging observability backend
- [ ] Metrics wired from EventSDK + Menu projection telemetry
- [ ] Alerts routed to staging channel only (not production on-call)
- [ ] Screenshot archive process documented
- [ ] ARB read-only access granted

---

**Reference:** [docs/m6/v1.0/EVENT-OBSERVABILITY.md](../../m6/v1.0/EVENT-OBSERVABILITY.md) · [docs/m7/v1.0/MENU-OBSERVABILITY.md](../../m7/v1.0/MENU-OBSERVABILITY.md)
