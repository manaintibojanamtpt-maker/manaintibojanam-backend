# M6 PR-6 — Projection Runtime & Persistence Report

**Program:** BHOS-M6-A  
**PR:** M6 PR-6 — Projection Persistence & Generic Projection Runtime  
**Date:** 2026-06-26  
**Status:** Complete — awaiting ARB approval  
**SDK Version:** `0.6.0-projection-runtime`

---

## 1. Executive Summary

M6 PR-6 delivers **generic projection runtime infrastructure** with durable in-memory persistence for checkpoints, snapshot metadata, execution history, and statistics. The runtime coordinates existing PR-4 projection worker/runner components with a new persistence layer.

**Infrastructure only.** No business read models, no Order/Menu/Search/Discovery/Branch projections, no runtime consumers, no Firestore migrations. Triple flag gate defaults OFF.

---

## 2. Architecture

```
Outbox (future)
  ↓
Projection Runtime
  ↓
Projection Coordinator
  ↓
Projection Runner + Worker (PR-4)
  ↓
Projection Persistence Adapter
  ├── Checkpoint Persistence
  ├── Snapshot Repository
  ├── Execution History
  └── Statistics Store
  ↓
STOP — no business read models
```

---

## 3. Runtime Lifecycle

```
1. Runtime checks triple flag gate
2. Generate executionId
3. Coordinator validates input
4. Load existing checkpoint (if any)
5. Runner executes batch via Worker
6. Persist checkpoint (projectionName, eventId, sequence, projectionVersion, schemaVersion, consumerGroup, updatedAt)
7. Save snapshot metadata (if events processed)
8. Append execution history record
9. Update statistics (processed, failed, skipped, checkpointCount, averageDuration)
10. Return ProjectionRuntimeExecuteResult
```

---

## 4. Persistence Model

### Checkpoint

| Field | Purpose |
|-------|---------|
| `projectionName` | Worker identity |
| `projectionVersion` | Handler logic version |
| `consumerGroup` | Consumer partition |
| `eventId` | Last processed event |
| `sequence` | Monotonic sequence |
| `schemaVersion` | Last event schema version |
| `updatedAt` | Persistence timestamp |

### Execution History

| Field | Purpose |
|-------|---------|
| `executionId` | Unique run identifier |
| `projectionName` | Target projection |
| `startedAt` / `completedAt` | Timing |
| `durationMs` | Elapsed time |
| `status` | running / completed / failed |
| `processedEvents` / `failedEvents` | Counts |
| `retryCount` | Retry metadata |

### Statistics

| Metric | Tracked |
|--------|---------|
| `processed` | Successfully processed events |
| `failed` | Failed events |
| `replayed` | Replay count (future) |
| `skipped` | Skipped events |
| `checkpointCount` | Checkpoints saved |
| `averageDurationMs` | Rolling average execution duration |

---

## 5. Feature Flags

| Flag | Default | Required |
|------|---------|----------|
| `FF_EVENT_PLATFORM_ENABLED` | OFF | ✅ |
| `FF_EVENT_PROJECTION_ENABLED` | OFF | ✅ |
| `FF_EVENT_PROJECTION_RUNTIME_ENABLED` | OFF | ✅ |

Env key: `VITE_FF_EVENT_PROJECTION_RUNTIME_ENABLED`

---

## 6. Deliverables

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | ProjectionRuntime | `src/sdk/events/projection/runtime/ProjectionRuntime.ts` |
| 2 | ProjectionCoordinator | `src/sdk/events/projection/runtime/ProjectionCoordinator.ts` |
| 3 | ProjectionPersistenceAdapter | `src/sdk/events/projection/runtime/ProjectionPersistenceAdapter.ts` |
| 4 | ProjectionCheckpointPersistence | `src/sdk/events/projection/runtime/ProjectionCheckpointPersistence.ts` |
| 5 | ProjectionSnapshotRepository | `src/sdk/events/projection/runtime/ProjectionSnapshotRepository.ts` |
| 6 | ProjectionExecutionHistory | `src/sdk/events/projection/runtime/ProjectionExecutionHistory.ts` |
| 7 | InMemoryProjectionStatisticsStore | `src/sdk/events/projection/runtime/InMemoryProjectionStatisticsStore.ts` |
| 8 | ProjectionRuntimeFactory | `src/sdk/events/projection/runtime/ProjectionRuntimeFactory.ts` |
| 9 | Runtime ports | `src/sdk/events/contracts/projectionRuntimePorts.ts` |
| 10 | Domain runtime | `src/domain/events/projection/runtime/` |
| 11 | Tests | `eventSdkProjectionRuntime.test.ts`, `projectionRuntimeDomain.test.ts` |

---

## 7. Telemetry

| Event | When |
|-------|------|
| `projection_runtime_started` | Runtime execute begins |
| `projection_runtime_completed` | Runtime execute succeeds |
| `projection_runtime_failed` | Runtime execute fails |
| `projection_snapshot_saved` | Snapshot metadata persisted |
| `projection_execution_recorded` | History record appended |
| `projection_statistics_updated` | Statistics store updated |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Accidental runtime enable in prod | Low | Medium | Triple flag gate |
| In-memory persistence loss | Certain in PR-6 | Low | Test-only; Firestore adapter PR-7+ |
| Business projection premature | Low | High | No business handlers; infra probe only in tests |
| Checkpoint corruption | Low | Medium | Domain validation on persist |

---

## 9. Rollback Plan

1. Set `FF_EVENT_PROJECTION_RUNTIME_ENABLED` → OFF
2. PR-4 projection worker unaffected (separate flag)
3. No Firestore collections created
4. Revert PR-6 merge — no runtime wiring exists
5. `npm run test:sdk` confirms all tests pass

---

## 10. Migration Roadmap

| Phase | PR | Scope |
|-------|-----|-------|
| PR-1–PR-5 | ✅ | Foundation through order shadow events |
| **PR-6** | ✅ | Generic projection runtime + persistence |
| PR-7 | 🔒 | First Order Read Projection |
| PR-8+ | 🔒 | Firestore checkpoint adapter |

---

## 11. Definition of Ready

- [x] M6 PR-1 through PR-5 complete
- [x] 624/624 tests at PR-5 baseline
- [x] Projection worker foundation (PR-4) certified
- [x] No business projection scope

## 12. Definition of Done

- [x] Runtime, coordinator, persistence adapter implemented
- [x] Checkpoint, snapshot, history, statistics in-memory stores
- [x] Domain runtime types and validation
- [x] Runtime ports defined (additive)
- [x] Triple flag gate, default OFF
- [x] No business handlers, no runtime consumers
- [x] No Firestore migrations
- [x] Deterministic unit tests
- [x] All tests passing

---

**STOP.** Await explicit ARB approval before M6 PR-7 (First Order Read Projection).
