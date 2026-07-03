# Projection Read Rollout (M6 PR-12)

Controlled rollout policy infrastructure for staged projection read routing.

## Stages

| Stage | Traffic |
|-------|---------|
| 0 | Legacy only |
| 1 | 1% |
| 2 | 5% |
| 3 | 25% |
| 4 | 50% |
| 5 | 100% |

## Usage

```typescript
import { createProjectionRolloutInfrastructure } from '@/sdk/order/rollout/ProjectionRolloutFactory';

const rollout = createProjectionRolloutInfrastructure({ featureFlags });
const route = await rollout.evaluator.evaluateRouting('order-001');
```

**STOP.** Not wired to adapter or OrderSDK. Await PR-13 for production certification.
