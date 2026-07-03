# Menu Projection Rollout (M7 PR-12)

Controlled menu projection rollout policy engine. **Infrastructure only — not wired into MenuSDK or Menu Read Adapter.**

## Stages (configuration only)

| Stage | Projection % |
|-------|--------------|
| 0 | 0% (legacy only) |
| 1 | 1% |
| 2 | 5% |
| 3 | 25% |
| 4 | 50% |
| 5 | 100% |

## Feature Flag (default OFF)

- `FF_MENU_PROJECTION_ROLLOUT_ENABLED`

## Usage

```typescript
import { createMenuProjectionRollout } from '@/sdk/menu/rollout/ProjectionRolloutFactory';

const rollout = createMenuProjectionRollout({ featureFlags });
const route = await rollout.evaluator.evaluateRouting('catalog-001');
```

**STOP.** No production routing. Await ARB approval before PR-13 certification.
