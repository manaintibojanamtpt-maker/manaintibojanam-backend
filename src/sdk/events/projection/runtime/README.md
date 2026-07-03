# Projection Runtime (M6 PR-6)

Generic projection runtime infrastructure — **no business read models**.

## Architecture

```
Outbox (future consumer)
  ↓
Projection Runtime
  ↓
Projection Coordinator
  ↓
Projection Runner + Worker (PR-4)
  ↓
Projection Persistence Adapter
  ↓
Checkpoint / Snapshot / History / Statistics
  ↓
STOP
```

## Components

| Component | Responsibility |
|-----------|----------------|
| `ProjectionRuntime` | Execute with triple flag gate |
| `ProjectionCoordinator` | Orchestrate run + persistence |
| `ProjectionPersistenceAdapter` | Facade over persistence ports |
| `ProjectionCheckpointPersistence` | Persist checkpoint cursor |
| `ProjectionSnapshotRepository` | Snapshot metadata |
| `ProjectionExecutionHistory` | Execution records |
| `InMemoryProjectionStatisticsStore` | Aggregate statistics |

## Feature Flags (ALL required, default OFF)

- `FF_EVENT_PLATFORM_ENABLED`
- `FF_EVENT_PROJECTION_ENABLED`
- `FF_EVENT_PROJECTION_RUNTIME_ENABLED`

## Factories

```typescript
import { createProjectionRuntimeInfrastructure } from '@/sdk/events/projection/runtime/ProjectionRuntimeFactory';
```

**STOP.** No business projections. Await ARB approval before PR-7.
