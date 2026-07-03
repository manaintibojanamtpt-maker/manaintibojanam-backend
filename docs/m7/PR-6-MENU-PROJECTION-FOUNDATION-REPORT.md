# M7 PR-6 — Menu Projection Foundation Report

**Program:** BHOS-M7  
**PR:** M7 PR-6 — Menu Projection Foundation  
**Date:** 2026-06-27  
**Status:** Complete — awaiting ARB approval

---

## 1. Executive Summary

M7 PR-6 delivers **menu projection infrastructure** — coordinator, checkpoint repository, snapshot repository, execution metadata repository, telemetry, and factories. Pure domain types live under `src/domain/menu/projection/`.

**No business projections. No read models. No runtime consumers. No Firestore. No MenuSDK integration.** Feature flag `FF_MENU_PROJECTION_ENABLED` remains **OFF** by default.

---

## 2. Architecture

```
Business Events (future)
        ↓
Projection Worker (future)
        ↓
MenuProjectionCoordinator
        ↓
MenuProjectionRepository / Checkpoint / Snapshot
        ↓
Read Models (future) → MenuSDK (future)
```

Frozen layers (MenuSDK, MenuFacade, Menu Domain catalog, Menu Repository) are untouched.

---

## 3. Projection Lifecycle

1. **Gate** — `FF_MENU_PROJECTION_ENABLED` → stub coordinator if OFF
2. **Validate** — domain validators on execute request
3. **Start** — `menu_projection_started` telemetry + execution record
4. **Load checkpoint** — prior cursor (if any)
5. **Persist** — checkpoint + optional snapshot metadata + execution record
6. **Complete** — `menu_projection_completed` or `menu_projection_failed`

No business event mapping in this PR.

---

## 4. Checkpoint Model

| Field | Purpose |
|-------|---------|
| `projectionName` | Projection identity |
| `projectionVersion` | Version cursor |
| `eventId` | Last processed event |
| `sequence` | Monotonic sequence |
| `schemaVersion` | Schema compatibility |
| `consumerGroup` | Consumer isolation |
| `updatedAt` | Persistence timestamp |

---

## 5. Snapshot Strategy

Snapshots store **metadata only** (`snapshotId`, cursor fields, `capturedAt`). No menu read model payloads. Persisted when `processedEvents > 0`.

---

## 6. Telemetry

| Event | When |
|-------|------|
| `menu_projection_started` | Execution begins |
| `menu_projection_completed` | Successful completion |
| `menu_projection_failed` | Validation, persistence, or projection failure |
| `menu_projection_checkpoint_saved` | Checkpoint persisted |
| `menu_projection_snapshot_saved` | Snapshot metadata persisted |

---

## 7. Generated Files

### Domain (`src/domain/menu/projection/`)

| File | Purpose |
|------|---------|
| `MenuProjectionMetadata.ts` | Identity constants |
| `MenuProjectionCheckpoint.ts` | Checkpoint model |
| `MenuProjectionSnapshot.ts` | Snapshot metadata |
| `MenuProjectionExecution.ts` | Execution records |
| `MenuProjectionPlan.ts` | Execution plan |
| `MenuProjectionValidation.ts` | Pure validators |

### SDK (`src/sdk/menu/projection/`)

| File | Purpose |
|------|---------|
| `MenuProjectionPorts.ts` | Port contracts |
| `MenuProjectionRepository.ts` | Execution metadata store |
| `MenuProjectionCheckpointRepository.ts` | Checkpoint store |
| `MenuProjectionSnapshotRepository.ts` | Snapshot metadata store |
| `MenuProjectionCoordinator.ts` | Coordinator |
| `MenuProjectionTelemetry.ts` | Telemetry emitter |
| `MenuProjectionFactory.ts` | Factories |

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Confusion with `repository/MenuProjectionRepository` read port | Separate paths; PR-6 is infrastructure only |
| Premature worker wiring | No EventSDK integration in this PR |
| Flag accidentally ON | Default OFF; stub coordinator |
| Global in-memory stores | Test-only pattern; Firestore in future PR |

---

## 9. Rollback

1. Remove `src/domain/menu/projection/` and `src/sdk/menu/projection/`
2. Remove test files from `test:sdk` script
3. No frozen-layer changes to revert

---

## 10. Migration Roadmap

| Phase | Action |
|-------|--------|
| PR-6 (this) | Infrastructure foundation |
| PR-7+ | First menu shadow projection (blocked — ARB) |
| Future | Event worker wiring, read models, Firestore |

---

## 11. Definition of Ready

- [x] M7 PR-1 through PR-5 complete
- [x] `FF_MENU_PROJECTION_ENABLED` declared in PR-1
- [x] Event projection patterns available (M6 reference)

---

## 12. Definition of Done

- [x] Projection infrastructure exists
- [x] Coordinator operational
- [x] Checkpoint model complete
- [x] Snapshot persistence complete
- [x] Telemetry operational
- [x] Feature flag OFF by default
- [x] No production behavior changes
- [x] Tests mock infrastructure only
- [x] Documentation complete

---

## 13. Certification Checklist

- [x] Coordinator coordinates execution metadata only
- [x] No business projections implemented
- [x] No read model payloads in snapshots
- [x] No Firestore
- [x] No Event Platform / worker wiring
- [x] No MenuSDK / MenuFacade changes
- [x] All tests passing

**STOP.** Do not begin M7 PR-7 until explicit ARB approval.
