# Menu Read Adapter Layer (M7 PR-11)

Standalone menu read adapter capable of routing between legacy and shadow projection. **NOT wired into `createMenuSDK()`. Legacy remains authoritative.**

## Architecture

```
Presentation → MenuSDK (unchanged) → Legacy Repository
                      ↓ (standalone, not wired)
               Menu Read Adapter → Legacy | Projection
```

## Feature Flag (default OFF)

- `FF_MENU_PROJECTION_ADAPTER_ENABLED`

## Routing Gates

Projection selected only when ALL pass:

1. `FF_MENU_PROJECTION_ADAPTER_ENABLED`
2. Projection soak certification READY
3. Operational validation GREEN
4. Projection repository healthy

Otherwise → legacy with automatic fallback on projection failures.

## Usage

```typescript
import { createMenuAdapterInfrastructure } from '@/sdk/menu/adapter/MenuAdapterFactory';

const infra = createMenuAdapterInfrastructure({
  featureFlags,
  legacyRepository,
  projectionRepository,
  readiness,
});
const menu = await infra.adapter.getMenu({ tenantId });
```

**STOP.** No production switch. Await ARB approval before PR-12 rollout.
