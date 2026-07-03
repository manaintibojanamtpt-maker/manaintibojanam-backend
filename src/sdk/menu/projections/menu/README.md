# Menu Catalog Shadow Projection (M7 PR-7)

First **catalog-centric** menu shadow projection. Consumes future menu catalog events via mock envelopes only.

## Architecture

```
Future Menu Events (mock only)
    ↓
MenuProjectionWorker
    ↓
MenuProjectionRepository (read model)
    ↓
MenuProjectionSnapshot
    ↓
STOP
```

No MenuSDK routing. No Event Platform. No Firestore. No runtime consumers.

## Supported events (schema definitions only)

- `menu.catalog.created.v1`
- `menu.catalog.updated.v1`
- `menu.catalog.deleted.v1`

## Feature flag

`FF_MENU_PROJECTION_ENABLED` (default OFF)

## Factories

- `createMenuProjectionWorker()`
- `createMenuProjectionRepository()`
- `createMenuProjectionWorkerBundle()` (test helper)

**STOP.** Await ARB approval before M7 PR-8 (Menu Projection Parity Validation).
