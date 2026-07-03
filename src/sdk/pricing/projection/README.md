# Pricing Projection SDK — M8 PR-6

Projection infrastructure for the Pricing platform. **Metadata only** — no read models, no business projections, no Event Platform wiring.

## Architecture

```
Future Pricing Events
        ↓
Pricing Projection Worker (future)
        ↓
PricingProjectionCoordinator
        ↓
Checkpoint / Snapshot / Execution Repositories (in-memory)
        ↓
STOP
```

## Factory

```typescript
import { createPricingProjectionInfrastructure } from '@/sdk/pricing/projection/PricingProjectionFactory';

const infra = createPricingProjectionInfrastructure({
  featureFlags: readPricingFlag,
});
```

**`FF_PRICING_PROJECTION_ENABLED` OFF (default) → stub coordinator returns `NOT_CONFIGURED`.**

## Feature Flag

| Flag | Default | Env |
|------|---------|-----|
| `FF_PRICING_PROJECTION_ENABLED` | `false` | `VITE_FF_PRICING_PROJECTION_ENABLED` |

## Telemetry (placeholder)

`pricing_projection_started`, `pricing_projection_completed`, `pricing_projection_failed`, `pricing_projection_checkpoint_saved`, `pricing_projection_snapshot_saved`

**STOP — M8 PR-7 (First Pricing Shadow Projection) requires ARB approval.**
