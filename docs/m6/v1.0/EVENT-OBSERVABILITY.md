# Event Observability v1.0

**Status:** Frozen — M6 PR-14  
**Date:** 2026-06-27

---

## 1. Overview

Event Platform emits structured telemetry across publish/subscribe, projection, parity, soak, operational, adapter, rollout, and certification layers. All telemetry is **opt-in via feature flags** — default OFF produces no event platform telemetry.

Governance events documented in [docs/m6/v1/EVENT-OBSERVABILITY.md](../v1/EVENT-OBSERVABILITY.md).

---

## 2. Telemetry events (SDK infrastructure)

| Event | When | Module |
|-------|------|--------|
| `event_publish_started` | Publish begins | EventSDK |
| `event_publish_completed` | Publish succeeds | EventSDK |
| `event_publish_failed` | Publish fails | EventSDK |
| `event_subscribe_registered` | Consumer registered | EventSDK |
| `event_replay_started` | Replay begins | Replay service |
| `event_replay_completed` | Replay finishes | Replay service |

---

## 3. Projection chain telemetry

| Event | When |
|-------|------|
| `projection_worker_started` | Worker tick begins |
| `projection_checkpoint_updated` | Checkpoint advanced |
| `order_projection_applied` | Order state updated |
| `order_parity_check_completed` | Parity run finished |
| `order_parity_mismatch` | Field mismatch detected |
| `projection_soak_sample_recorded` | Soak health sample |
| `event_operational_lag_detected` | Projection lag threshold |
| `event_operational_drift_detected` | Drift detected |

---

## 4. Adapter / rollout / certification

| Event | When |
|-------|------|
| `order_adapter_route_legacy` | Routed to legacy |
| `order_adapter_route_projection` | Routed to projection |
| `projection_rollout_stage_evaluated` | Rollout policy evaluated |
| `projection_certification_decision` | GO / CONDITIONAL / NO-GO |

---

## 5. Metrics (recommended)

| Metric | Type | Description |
|--------|------|-------------|
| `event.publish.count` | Counter | Published events by type |
| `event.publish.duration_ms` | Histogram | Publish latency |
| `event.consume.lag_ms` | Gauge | Consumer lag |
| `projection.checkpoint.age_ms` | Gauge | Checkpoint staleness |
| `order.parity.match_rate` | Gauge | Parity match percentage |
| `projection.soak.health_score` | Gauge | Soak health |
| `order.adapter.route.count` | Counter | Routes by source |

---

## 6. Correlation IDs

All event envelopes carry `correlationId` and `causationId` per ADR-019. Propagate through projection, parity, and certification runs for incident triage.

---

## 7. Projection monitoring

| Check | Frequency | Alert threshold |
|-------|-----------|-----------------|
| Outbox depth | 1 min | > 1000 pending |
| Consumer lag | 1 min | > 30 s |
| Checkpoint age | 5 min | > 5 min |
| Parity match rate | 1 hour | < 99.9% |
| Soak health | Continuous | Score < 0.80 |

---

**Default (flags OFF):** No event platform telemetry emitted in production.
