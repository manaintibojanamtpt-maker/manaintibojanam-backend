# Projection Worker (M6 PR-4)

**Version:** `0.4.0-projection`  
**Status:** Generic projection worker infrastructure  
**Governance:** [PR-4 Report](../../docs/m6/PR-4-PROJECTION-WORKER-FOUNDATION-REPORT.md)

---

## Purpose

Generic projection worker infrastructure — registry, dispatcher, checkpoint, lease, runner. **No business projections** (Order, Menu, Search, Discovery).

---

## Architecture

```
Outbox → Publisher → Subscriber → Projection Worker → Checkpoint → Read Models (future)
```

---

## Components

| Component | Responsibility |
|-----------|----------------|
| `ProjectionWorker` | Validate envelope, dispatch, checkpoint, retry |
| `ProjectionDispatcher` | Handler resolution, version compatibility |
| `ProjectionRegistry` | Register/lookup/validate; reject duplicate `ProjectionIdentity` |
| `ProjectionCheckpointRepository` | Save/restore cursor (in-memory) |
| `ProjectionLeaseManager` | Acquire/renew/release lease (in-memory) |
| `ProjectionRunner` | Orchestrate lease + batch + checkpoint; pause/resume/cancel |
| `ProjectionRebuildEngine` | Infrastructure rebuild prepare/execute/resume/cancel |
| `ProjectionTelemetry` | 12 telemetry event types |
| `ProjectionInfrastructureFactory` | Canonical factory entry point |

---

## Feature Flags (default OFF)

| Flag | Purpose |
|------|---------|
| `FF_EVENT_PLATFORM_ENABLED` | Master switch |
| `FF_EVENT_PROJECTION_ENABLED` | Projection worker infrastructure |

---

## Factories

```typescript
import { createProjectionInfrastructure } from '@/sdk/events';
```

---

**STOP.** Await ARB approval before M6 PR-5.
