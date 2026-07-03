# Projection Operational Validation (M6 PR-10)

Staging operational validation for the event spine. **Evidence only — no production changes.**

## Architecture

```
Legacy Orders → Shadow Events → Outbox → Projection Runtime → Order Projection
  ↓
Parity Validation → Parity Soak → Operational Validator → Readiness Dashboard → STOP
```

## Feature Flags (ALL required, default OFF)

- All six PR-9 flags plus `FF_EVENT_OPERATIONAL_VALIDATION_ENABLED`

## Usage

```typescript
import { createProjectionOperationalInfrastructure } from '@/sdk/events/operations/ProjectionOperationalFactory';

const ops = createProjectionOperationalInfrastructure({ featureFlags });
const result = await ops.validate('order-read-shadow');
```

**STOP.** No adapter switch. Await ARB approval before PR-11.
