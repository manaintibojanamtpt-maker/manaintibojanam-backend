# M6 PR-10 — Staging Operational Validation Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-10 — Staging Rollout & Operational Validation  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval  
**SDK Version:** `0.10.0-operational-validation`

---

## 1. Executive Summary

M6 PR-10 delivers **staging operational validation infrastructure** that measures projection lag, replay success, drift, latency, throughput, and checkpoint health from parity-validated event spine samples. It generates operational evidence and readiness recommendations without any production behavior change.

**Evidence only.** OrderSDK continues reading the legacy source. No adapter switch, no production routing, no Firestore migration, no runtime consumers. Hepta flag gate defaults OFF.

---

## 2. Architecture

```
Legacy Orders → Shadow Events → Outbox → Projection Runtime → Order Projection
  ↓
Parity Validation → Parity Soak → Operational Validator → Readiness Dashboard → STOP
```

---

## 3. Operational Lifecycle

```
1. Check hepta flag gate
2. Load operational samples from sample source
3. Analyze projection lag (current, maximum, checkpoint age)
4. Detect drift (duplicates, drops, missing, out-of-order)
5. Validate replay success rate
6. Aggregate metrics (latency P95/P99, throughput, uptime)
7. Evaluate health (GREEN/AMBER/RED)
8. Generate readiness (READY_FOR_SWITCH / REQUIRES_INVESTIGATION / NOT_READY)
9. Persist report + lag + dashboard snapshot
10. Emit telemetry
```

---

## 4. Health Metrics

| Metric | Description |
|--------|-------------|
| `averageProjectionLatencyMs` | Mean processing latency |
| `p95LatencyMs` | 95th percentile latency |
| `p99LatencyMs` | 99th percentile latency |
| `maximumLagMs` | Max event processing lag |
| `replaySuccessPercent` | Replay verification rate |
| `duplicatePercent` | Duplicate processing rate |
| `droppedEventPercent` | Dropped event rate |
| `checkpointAgeMs` | Checkpoint staleness |
| `workerUptimePercent` | Worker availability |
| `projectionThroughputPerMinute` | Events processed per minute |

---

## 5. Lag Detection

Lag is computed as `evaluatedAt - lastEventProcessedAt`. Maximum lag tracks historical peaks. Checkpoint age is `evaluatedAt - checkpointUpdatedAt`. Telemetry `projection_lag_detected` fires when lag exceeds `maxLagMs`.

---

## 6. Replay Validation

Replay health = `replaySuccesses / replayAttempts × 100`. Verified when ≥ `minReplaySuccessPercent` (default 99%). Telemetry `projection_replay_verified` on success.

---

## 7. Drift Detection

Drift detected when:
- Duplicate rate > `maxDuplicatePercent`
- Dropped event rate > `maxDroppedEventPercent`
- Missing events > 0
- Out-of-order events > 0

Telemetry `projection_drift_detected` on detection.

---

## 8. Readiness Rules

| Health | Readiness | Meaning |
|--------|-----------|---------|
| GREEN | READY_FOR_SWITCH | Staging validation passed — await 72h soak + ARB |
| AMBER/GREEN+drift | REQUIRES_INVESTIGATION | Anomalies need remediation |
| RED / insufficient sample | NOT_READY | Blocked |

---

## 9. Telemetry

| Event | When |
|-------|------|
| `projection_operational_started` | Validation begins |
| `projection_operational_completed` | Validation finishes |
| `projection_operational_failed` | Failure |
| `projection_lag_detected` | Lag exceeds threshold |
| `projection_drift_detected` | Drift detected |
| `projection_replay_verified` | Replay threshold met |
| `projection_health_updated` | Health/readiness computed |

---

## 10. Feature Flags

| Flag | Default | Required |
|------|---------|----------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_ENABLED` | OFF | Yes |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | OFF | Yes |
| `FF_ORDER_READ_PROJECTION_ENABLED` | OFF | Yes |
| `FF_ORDER_PROJECTION_PARITY_ENABLED` | OFF | Yes |
| `FF_ORDER_PROJECTION_SOAK_ENABLED` | OFF | Yes |
| `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` | OFF | Yes |

---

## 11. Generated Files

### SDK — `src/sdk/events/operations/`

| File | Purpose |
|------|---------|
| `ProjectionOperationalValidator.ts` | Main orchestrator |
| `ProjectionLagAnalyzer.ts` | Lag analysis |
| `ProjectionHealthMonitor.ts` | Health evaluation |
| `ProjectionDriftDetector.ts` | Drift detection |
| `ProjectionReplayValidator.ts` | Replay validation |
| `ProjectionOperationalTelemetry.ts` | Telemetry hooks |
| `ProjectionOperationalFactory.ts` | Infrastructure wiring |
| `README.md` | Module documentation |

### Domain — `src/domain/events/operations/`

| File | Purpose |
|------|---------|
| `ProjectionOperationalRules.ts` | Metrics, health, readiness |
| `ProjectionLag.ts` | Lag types and computation |
| `ProjectionDrift.ts` | Drift detection rules |
| `ProjectionHealth.ts` | Health score types |
| `ProjectionReplayHealth.ts` | Replay health |
| `ProjectionOperationalThresholds.ts` | Configurable thresholds |
| `README.md` | Domain documentation |

### Ports — `src/sdk/events/contracts/projectionOperationalPorts.ts`

`ProjectionOperationalRepositoryPort`, `ProjectionLagRepositoryPort`, `ProjectionHealthRepositoryPort`

### Tests

| File | Tests |
|------|-------|
| `eventSdkProjectionOperational.test.ts` | 11 |
| `projectionOperationsDomain.test.ts` | 11 |

---

## 12. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature adapter switch | No OrderSDK changes; evidence only |
| Production impact | Hepta flag gate; all flags default OFF |
| Parity framework regression | PR-8/PR-9 files untouched |
| False READY confidence | Configurable thresholds + min sample size |
| Firestore migration pressure | In-memory repositories only |

---

## 13. Rollback Plan

1. Disable `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` (default OFF)
2. No data migration — in-memory stores only
3. OrderSDK unaffected
4. Revert SDK version to `0.9.0-projection-soak` if needed

---

## 14. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Parity soak & certification | PR-9 ✅ | Complete |
| **Staging operational validation** | **PR-10 ✅** | **Complete** |
| OrderSDK adapter switch | PR-11 🔒 | ARB + soak + staging blocked |
| Production routing | Future | After explicit rollout approval |

---

## 15. Definition of Ready

- [x] PR-9 parity soak certification available
- [x] Operational thresholds defined
- [x] Health and readiness models agreed
- [x] ARB scope approved for staging validation only

---

## 16. Definition of Done

- [x] Operational metrics generated
- [x] Health monitoring operational
- [x] Replay validation operational
- [x] Lag detection operational
- [x] Drift detection operational
- [x] Readiness recommendation generated
- [x] `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED` added (default OFF)
- [x] Deterministic tests with mock repositories
- [x] No production behavior changes
- [x] SDK version bumped to `0.10.0-operational-validation`

---

## 17. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Evidence only — no adapter switch | ✅ |
| 2 | OrderSDK unchanged | ✅ |
| 3 | Parity framework unchanged | ✅ |
| 4 | No Firestore migration | ✅ |
| 5 | No runtime wiring | ✅ |
| 6 | All flags default OFF | ✅ |
| 7 | Metrics + health + readiness generated | ✅ |
| 8 | Deterministic tests pass | ✅ |
| 9 | Additive changes only | ✅ |
| 10 | Rollback-safe | ✅ |

---

**STOP.** Do not proceed to M6 PR-11 (OrderSDK Projection Adapter Switch) until parity certified, operational validation GREEN, 72-hour staging soak completed, ARB approval, and explicit production rollout approval.
