# Pricing Projection Rollout (M8 PR-12)

Standalone rollout policy engine for staged percentage-based routing between legacy pricing reads and pricing projections.

**NOT wired into `createPricingSDK()` or Pricing Read Adapter.**

## Architecture

```
PricingSDK (unchanged) → Legacy Repository ✓

Pricing Read Adapter (unchanged, NOT WIRED)

Standalone: PricingProjectionRolloutPolicy Engine → Routing Decision → STOP
```

## Feature flag

- `FF_PRICING_PROJECTION_ROLLOUT_ENABLED` (default OFF)
- Environment: `VITE_FF_PRICING_PROJECTION_ROLLOUT_ENABLED`

## Rollout stages

| Stage | Projection % |
|-------|--------------|
| 0 | 0% (legacy only) |
| 1 | 1% |
| 2 | 5% |
| 3 | 25% |
| 4 | 50% |
| 5 | 100% |

## Factory

```typescript
import { createPricingProjectionRollout } from './PricingProjectionRolloutFactory';

const rollout = createPricingProjectionRollout({
  initialHealth: healthySnapshot,
  onTelemetry: (event) => console.log(event),
});

const decision = await rollout.evaluator.evaluateRouting('price-list-001');
```

Policy only. No runtime consumers. No production routing.

**STOP.** Await ARB approval before M8 PR-13 (Pricing Projection Read Switch Certification).
