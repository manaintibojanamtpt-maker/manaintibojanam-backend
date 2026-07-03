# M7 PR-10 — Menu Operational Validation Report

**Program:** BHOS-M7  
**PR:** M7 PR-10 — Menu Operational Validation  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-10 delivers **menu projection operational validation infrastructure** that measures projection lag, replay success, drift, latency, throughput, and checkpoint health from mock operational samples. It generates operational evidence and readiness recommendations without any production behavior change.

**Evidence only.** MenuSDK continues reading the legacy source. No adapter switch, no production routing, no Firestore migration, no runtime consumers. Quad flag gate defaults OFF.

---

## 2. Architecture

```
Legacy Menu → Shadow Projection → Parity → Soak → Operational Validation → Readiness Report → STOP
```

---

## 3. Operational Validation Flow

```
1. Validate feature flags (quad gate)
2. Load mock operational samples
3. Analyze projection lag (current, maximum, checkpoint age)
4. Detect drift (duplicates, drops, missing, out-of-order)
5. Validate replay success rate
6. Aggregate metrics (latency P95/P99, throughput, uptime)
7. Evaluate health (GREEN/AMBER/RED)
8. Generate readiness (READY_FOR_SWITCH / REQUIRES_INVESTIGATION / NOT_READY)
9. Persist report + lag + health snapshot (in-memory)
10. Emit telemetry
11. STOP
```

---

## 4. Health Model

| Status | Meaning |
|--------|---------|
| `GREEN` | All operational metrics within thresholds |
| `AMBER` | Threshold breaches with score ≥ 70 |
| `RED` | Score < 70 or ≥ 4 penalty conditions |

---

## 5. Lag Strategy

Lag is computed as `evaluatedAt - lastEventProcessedAt`. Maximum lag tracks historical peaks from the lag repository. Checkpoint age is `evaluatedAt - checkpointUpdatedAt`. Telemetry `menu_projection_lag_detected` fires when lag exceeds `maxLagMs` (default 30 seconds).

---

## 6. Replay Strategy

Replay health = `replaySuccesses / replayAttempts × 100`. Verified when ≥ `minReplaySuccessPercent` (default 99%). Telemetry `menu_projection_replay_verified` on success.

---

## 7. Drift Strategy

Drift detected when:
- Duplicate rate > `maxDuplicatePercent`
- Dropped event rate > `maxDroppedEventPercent`
- Missing events > 0
- Out-of-order events > 0
- Projection drift count > `maxCriticalDriftCount` (default 0)

Telemetry `menu_projection_drift_detected` on detection.

---

## 8. Thresholds

| Threshold | Default |
|-----------|---------|
| `maxLagMs` | 30,000 ms (30 s) |
| `minReplaySuccessPercent` | 99% |
| `maxP95LatencyMs` | 500 ms |
| `maxCriticalDriftCount` | 0 |
| `minWorkerUptimePercent` | 99% |
| `minSampleSize` | 10 (configurable) |

---

## 9. Operational Metrics

| Metric | Description |
|--------|-------------|
| `currentLagMs` | Current event processing lag |
| `maximumLagMs` | Peak lag including historical |
| `checkpointAgeMs` | Checkpoint staleness |
| `replaySuccessPercent` | Replay verification rate |
| `averageProjectionLatencyMs` | Mean processing latency |
| `p95LatencyMs` | 95th percentile latency |
| `p99LatencyMs` | 99th percentile latency |
| `projectionThroughputPerMinute` | Events processed per minute |
| `workerUptimePercent` | Worker availability |
| `duplicateEventCount` | Duplicate events in sample |
| `missingEventCount` | Missing projection events |
| `outOfOrderEventCount` | Out-of-order events |
| `projectionDriftCount` | Combined drift event count |

---

## 10. Telemetry

| Event | When |
|-------|------|
| `menu_operational_started` | Validation begins |
| `menu_operational_completed` | Validation finishes |
| `menu_operational_failed` | Failure |
| `menu_projection_lag_detected` | Lag exceeds threshold |
| `menu_projection_drift_detected` | Drift detected |
| `menu_projection_replay_verified` | Replay threshold met |
| `menu_projection_health_updated` | Health/readiness computed |

---

## 11. Feature Flags

| Flag | Default | Required |
|------|---------|----------|
| `FF_MENU_PROJECTION_ENABLED` | OFF | Yes |
| `FF_MENU_PROJECTION_PARITY_ENABLED` | OFF | Yes |
| `FF_MENU_PROJECTION_SOAK_ENABLED` | OFF | Yes |
| `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` | OFF | Yes |

---

## 12. Generated Files

### SDK — `src/sdk/menu/operations/`

| File | Purpose |
|------|---------|
| `MenuOperationalValidator.ts` | Main orchestrator + in-memory adapters |
| `MenuLagAnalyzer.ts` | Lag analysis |
| `MenuProjectionHealthMonitor.ts` | Health evaluation |
| `MenuProjectionDriftDetector.ts` | Drift detection |
| `MenuReplayValidator.ts` | Replay validation |
| `MenuOperationalTelemetry.ts` | Telemetry hooks |
| `MenuOperationalFactory.ts` | `createMenuOperationalInfrastructure()` |
| `menuOperationalPorts.ts` | Port contracts |
| `README.md` | Module documentation |

### Domain — `src/domain/menu/operations/`

| File | Purpose |
|------|---------|
| `MenuOperationalRules.ts` | Metrics, health, readiness |
| `MenuProjectionLag.ts` | Lag types and computation |
| `MenuProjectionDrift.ts` | Drift detection rules |
| `MenuProjectionHealth.ts` | Health score types |
| `MenuReplayHealth.ts` | Replay health |
| `MenuOperationalThresholds.ts` | Configurable thresholds |
| `README.md` | Domain documentation |

### Tests

| File | Tests |
|------|-------|
| `menuCatalogProjectionOperational.test.ts` | 11 |
| `menuOperationsDomain.test.ts` | 12 |

---

## 13. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Premature adapter switch | No MenuSDK changes; evidence only |
| Production impact | Quad flag gate; all flags default OFF |
| Parity/soak regression | PR-8/PR-9 files untouched |
| False READY confidence | Configurable thresholds + min sample size |
| Firestore migration pressure | In-memory repositories only |

---

## 14. Rollback Plan

1. Disable `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` (default OFF)
2. No data migration — in-memory stores only
3. MenuSDK unaffected — continues reading legacy
4. Remove operational module if needed (additive only)

---

## 15. Migration Roadmap

| Phase | PR | Status |
|-------|-----|--------|
| Projection soak & certification | PR-9 ✅ | Complete |
| **Menu operational validation** | **PR-10 ✅** | **Complete** |
| Menu read adapter layer | PR-11 🔒 | ARB blocked |
| Production routing | Future | After explicit rollout approval |

---

## 16. Definition of Ready

- [x] PR-9 menu projection soak certification available
- [x] Operational thresholds defined
- [x] Health and readiness models agreed
- [x] ARB scope approved for operational validation only

---

## 17. Definition of Done

- [x] Operational evidence generated
- [x] Health model operational (GREEN/AMBER/RED)
- [x] Replay validation operational
- [x] Lag analysis operational
- [x] Drift analysis operational
- [x] Readiness recommendation generated
- [x] `FF_MENU_OPERATIONAL_VALIDATION_ENABLED` added (default OFF)
- [x] Deterministic tests with mock repositories
- [x] No production behavior changes
- [x] MenuSDK continues reading legacy

---

## 18. Certification Checklist

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Evidence only — no adapter switch | ✅ |
| 2 | MenuSDK unchanged | ✅ |
| 3 | MenuFacade unchanged | ✅ |
| 4 | Projection/parity/soak unchanged | ✅ |
| 5 | No Firestore migration | ✅ |
| 6 | No runtime wiring | ✅ |
| 7 | All flags default OFF | ✅ |
| 8 | Metrics + health + readiness generated | ✅ |
| 9 | Deterministic tests pass | ✅ |
| 10 | Additive changes only | ✅ |
| 11 | Rollback-safe | ✅ |

---

**STOP.** Do not proceed to M7 PR-11 (Menu Read Adapter Layer) until ARB approval.
