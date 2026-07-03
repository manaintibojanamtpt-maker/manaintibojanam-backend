# Staging Checklist — M6/M7 Unified Soak

**Program ID:** BHOS-STAGING-SOAK-001  
**Execution ID:** BHOS-STAGING-SOAK-EXEC-002  
**Environment:** STAGING ONLY  
**Execution date:** 2026-07-02

---

## Execution status (EXEC-002)

| Phase | Status |
|-------|--------|
| 0 — Pre-deploy | **FAIL** — terraform/helm/kubectl unavailable; no GCP project access |
| 1 — Terraform | **NOT EXECUTED** |
| 2 — Kubernetes | **NOT EXECUTED** |
| 3 — Observability | **NOT EXECUTED** |
| 4 — Tenants | **NOT EXECUTED** |
| 5 — Flags init | **NOT EXECUTED** |
| 6 — Enable E1–E14, M1–M9 | **NOT STARTED** |
| 7 — 72h soak | **NOT STARTED** (0h) |
| 8 — Failure injection | **NOT STARTED** |
| 9 — Rollback drill | **NOT STARTED** |
| 10 — Assessment | **COMPLETE** |

**Verdict:** [GO-NO-GO-REPORT.md](./GO-NO-GO-REPORT.md) — **NOT_READY**

**Observed CI baseline:** 1033/1033 pass (2026-07-02) — **not staging evidence**

---

## 1. Pre-soak bootstrap (Phase A — 24h)

### Environment

- [ ] Staging environment isolated from production
- [ ] Production flag store verified OFF for all M6/M7 flags
- [ ] Staging flag store separate from production
- [ ] 10 staging tenants provisioned (3 primary, 5 secondary, 2 control)
- [ ] Legacy persistence ports connected (staging data)
- [ ] No production tenant IDs in soak scope

### Observability

- [ ] Staging dashboards deployed (see [OBSERVABILITY-DASHBOARD.md](./OBSERVABILITY-DASHBOARD.md))
- [ ] Alert routing to Platform Ops on-call (staging channel only)
- [ ] Correlation ID propagation verified
- [ ] Log retention ≥ 30 days for soak evidence

### Baseline

- [ ] `npm run test:sdk` → 1033/1033 pass (pre-soak snapshot)
- [ ] Control tenants (flags OFF) baseline latency recorded
- [ ] Empty parity/soak/certification telemetry confirmed (flags OFF)

---

## 2. Event platform enable checklist

**Wait 15 min + smoke test between each step.**

| Step | Flag | Enabled | Smoke pass | Time (UTC) | Operator |
|------|------|---------|------------|------------|----------|
| E1 | `FF_EVENT_PLATFORM_ENABLED` | ☐ | ☐ | | |
| E2 | `FF_EVENT_OUTBOX_ENABLED` | ☐ | ☐ | | |
| E3 | `FF_EVENT_REPLAY_ENABLED` | ☐ | ☐ | | |
| E4 | `FF_EVENT_SHADOW_PUBLISHING_ENABLED` | ☐ | ☐ | | |
| E5 | `FF_EVENT_PROJECTION_ENABLED` | ☐ | ☐ | | |
| E6 | `FF_ORDER_SHADOW_EVENTS_ENABLED` | ☐ | ☐ | | |
| E7 | `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | ☐ | ☐ | | |
| E8 | `FF_ORDER_READ_PROJECTION_ENABLED` | ☐ | ☐ | | |
| E9 | `FF_ORDER_PROJECTION_PARITY_ENABLED` | ☐ | ☐ | | |
| E10 | `FF_ORDER_PROJECTION_SOAK_ENABLED` | ☐ | ☐ | | |
| E11 | `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | ☐ | ☐ | | |
| E12 | `FF_ORDER_PROJECTION_ADAPTER_ENABLED` | ☐ | ☐ | | |
| E13 | `FF_ORDER_PROJECTION_ROLLOUT_ENABLED` | ☐ | ☐ | | |
| E14 | `FF_ORDER_PROJECTION_CERTIFICATION_ENABLED` | ☐ | ☐ | | |

### E8 smoke test

- [ ] Order projection snapshot created for primary tenant
- [ ] Checkpoint advanced within 60s
- [ ] No errors in projection worker telemetry

### E9 smoke test

- [ ] Parity run completes
- [ ] Match rate logged (target ≥ 99% initial)

---

## 3. Menu platform enable checklist

| Step | Flag | Enabled | Smoke pass | Time (UTC) | Operator |
|------|------|---------|------------|----------|----------|
| M1 | `FF_MENU_ENABLED` | ☐ | ☐ | | |
| M2 | `FF_MENU_SEARCH_ENABLED` | ☐ | ☐ | | |
| M3 | `FF_MENU_PROJECTION_ENABLED` | ☐ | ☐ | | |
| M4 | `FF_MENU_PROJECTION_PARITY_ENABLED` | ☐ | ☐ | | |
| M5 | `FF_MENU_PROJECTION_SOAK_ENABLED` | ☐ | ☐ | | |
| M6 | `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` | ☐ | ☐ | | |
| M7 | `FF_MENU_PROJECTION_ADAPTER_ENABLED` | ☐ | ☐ | | |
| M8 | `FF_MENU_PROJECTION_ROLLOUT_ENABLED` | ☐ | ☐ | | |
| M9 | `FF_MENU_PROJECTION_CERTIFICATION_ENABLED` | ☐ | ☐ | | |

### M3 smoke test

- [ ] Catalog metadata projection refresh completes
- [ ] Snapshot age < 60s

---

## 4. Rollback order (reverse enable)

Execute on any RED gate or drill trigger:

```
E14 → E13 → E12 → E11 → E10 → E9 → E8 → E7 → E6 → E5 → E4 → E3 → E2 → E1
M9  → M8  → M7  → M6  → M5  → M4  → M3  → M2  → M1
```

| Step | Action | Done | Time | Recovery verified |
|------|--------|------|------|-------------------|
| L1a | Disable all Event flags (E14→E1) | ☐ | | ☐ |
| L1b | Disable all Menu flags (M9→M1) | ☐ | | ☐ |
| L1c | Verify legacy authoritative reads | ☐ | | ☐ |
| L1d | Confirm no projection telemetry | ☐ | | ☐ |

**Target L1 recovery:** < 1 minute

---

## 5. Hour-by-hour checklist (72h soak)

### Hours 0–24 (Day 1)

| Hour | Check | Order | Menu | Notes |
|------|-------|-------|------|-------|
| 0 | Soak clock start | ☐ | ☐ | |
| 1 | Lag, worker uptime | ☐ | ☐ | |
| 2 | Error rate | ☐ | ☐ | |
| 3 | Checkpoint age | ☐ | ☐ | |
| 4 | **Parity sample** | ☐ | ☐ | Record in PARITY-REPORT |
| 5 | Lag | ☐ | ☐ | |
| 6 | Throughput | ☐ | ☐ | |
| 7 | Memory/CPU | ☐ | ☐ | |
| 8 | **Parity sample** | ☐ | ☐ | |
| 9–11 | Hourly health | ☐ | ☐ | |
| 12 | **Daily report** | ☐ | ☐ | Day 1 summary |
| 13–15 | Hourly health | ☐ | ☐ | |
| 16 | **Parity sample** | ☐ | ☐ | |
| 17–19 | Hourly health | ☐ | ☐ | |
| 20 | **Parity sample** | ☐ | ☐ | |
| 21–23 | Hourly health | ☐ | ☐ | |

### Hours 24–48 (Day 2)

Repeat Day 1 pattern. Additional:

| Check | Done |
|-------|------|
| Day 2 daily report | ☐ |
| Replay dry-run (staging) | ☐ |
| Failure injection window scheduled | ☐ |

### Hours 48–72 (Day 3)

| Check | Done |
|-------|------|
| Parity every 4h (continue) | ☐ |
| Day 3 daily report | ☐ |
| T+72 certification evaluation | ☐ |
| Evidence package assembled | ☐ |

---

## 6. Daily checklist

### Every 24h

- [ ] Export parity report snapshot
- [ ] Export lag report snapshot
- [ ] Export projection health report
- [ ] Review GREEN/AMBER/RED scorecard
- [ ] Dashboard screenshot archive
- [ ] On-call handoff notes
- [ ] Confirm production flags still OFF
- [ ] Confirm no adapter routing to production paths

---

## 7. Failure thresholds (auto-escalate)

| Condition | Action |
|-----------|--------|
| Parity < 97% for 2 consecutive samples | **RED** — pause enable, investigate |
| Lag > 5 min sustained 15 min | **RED** — L1 rollback consideration |
| Worker uptime < 99% in 1h window | **AMBER** — restart worker, log |
| Replay success < 95% | **RED** — halt soak, L1 rollback |
| Checkpoint age > 5 min sustained | **AMBER** — trigger manual refresh |
| Error rate > 1% for 10 min | **RED** — L1 rollback |

---

## 9. Failure injection window (T+72h, optional)

Simulate in **staging only**. Record recovery in [REPLAY-REPORT.md](./REPLAY-REPORT.md) and [ROLLBACK-DRILL-REPORT.md](./ROLLBACK-DRILL-REPORT.md).

| # | Scenario | Method | Expected recovery | Recovery time | Pass |
|---|----------|--------|-------------------|---------------|------|
| F1 | Projection worker crash | SIGKILL worker pod | Auto-restart + checkpoint resume | < 30s | ☐ |
| F2 | Worker restart (clean) | Rolling restart | No data loss | < 60s | ☐ |
| F3 | Replay interruption | Cancel mid-batch replay | Idempotent resume | < 60s | ☐ |
| F4 | Duplicate events | Inject 10 dupes | Idempotency dedup | 0 dup applied | ☐ |
| F5 | Out-of-order events | updated before created | DLQ or reorder | No corruption | ☐ |
| F6 | Missing events | Skip created event | DLQ + alert | Parity flags gap | ☐ |
| F7 | Repository unavailable | 60s network block | Retry + lag spike, recover | < 5 min | ☐ |
| F8 | Checkpoint corruption | Inject bad sequence | Rebuild from prior checkpoint | < 5 min | ☐ |
| F9 | Telemetry outage | Disable exporter 15 min | Core path unaffected | N/A | ☐ |

**Pass criteria:** No data loss; legacy reads unaffected; L1 rollback still < 60s after recovery.

---

## 10. Success completion criteria

- [ ] 72 continuous hours with all soak flags ON
- [ ] Order parity ≥ 99.9% (final 24h average)
- [ ] Menu parity ≥ 99.9% (final 24h average)
- [ ] No sustained RED gates in final 24h
- [ ] Rollback drill completed with L1 < 1 min
- [ ] Certification packages generated (PR-13 evaluators)
- [ ] GO-NO-GO report submitted to ARB

---

**Status:** ☐ Not started · ☐ In progress · ☐ Complete
