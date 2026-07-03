# Projection Parity Soak (M6 PR-9)

Measures order projection parity over time and generates readiness certification metrics.

## Architecture

```
Legacy Orders → Parity Validator → Parity Reports → Parity Statistics
  ↓
Readiness Analyzer → Certification Report → STOP
```

## Feature Flags (ALL required, default OFF)

- `FF_EVENT_PLATFORM_ENABLED`
- `FF_EVENT_PROJECTION_ENABLED`
- `FF_EVENT_PROJECTION_RUNTIME_ENABLED`
- `FF_ORDER_READ_PROJECTION_ENABLED`
- `FF_ORDER_PROJECTION_PARITY_ENABLED`
- `FF_ORDER_PROJECTION_SOAK_ENABLED`

## Usage

```typescript
import { createProjectionParitySoakInfrastructure } from '@/sdk/events/parity/soak/ProjectionParityFactory';

const soak = createProjectionParitySoakInfrastructure({ featureFlags });
const result = await soak.runSoak(500);
```

**STOP.** No adapter switch. Await ARB approval before PR-10.
