# Menu Projection Infrastructure (M7 PR-6)

Infrastructure-only foundation for menu projections. **No business projections. No read models. No Firestore.**

## Architecture

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

## Factories

| Factory | Resolution |
|---------|------------|
| `createMenuProjectionInfrastructure()` | Full bundle |
| `createMenuProjectionRepository()` | In-memory execution metadata |
| `createMenuProjectionCoordinator()` | Coordinator or stub when flag OFF |

## Feature flag

`FF_MENU_PROJECTION_ENABLED` (default OFF)

## Telemetry

`menu_projection_started` · `menu_projection_completed` · `menu_projection_failed` · `menu_projection_checkpoint_saved` · `menu_projection_snapshot_saved`

**STOP.** Await ARB approval before M7 PR-7 (first menu shadow projection).
