# Order Read Adapter (M6 PR-11)

Routing adapter capable of reading from **legacy** or **projection** repositories via feature flag.

## Architecture

```
Presentation → OrderSDK → OrderReadAdapter
                            ├─ LegacyOrderAdapter → Legacy Repository
                            └─ ProjectionOrderAdapter → Projection Repository
```

## Routing

| Condition | Source |
|-----------|--------|
| `FF_ORDER_PROJECTION_ADAPTER_ENABLED` OFF | Legacy |
| Parity not READY | Legacy (fallback) |
| Operational not GREEN | Legacy (fallback) |
| Projection repo unavailable | Legacy (fallback) |
| All gates pass | Projection |

## Usage

```typescript
import { createOrderReadAdapterInfrastructure } from '@/sdk/order/adapter/OrderAdapterFactory';

const infra = createOrderReadAdapterInfrastructure({ featureFlags, legacyRepository, projectionRepository, readiness });
const order = await infra.adapter.getOrderById('order-001');
```

**STOP.** Not wired into `createOrderSDK`. Legacy remains default. Await PR-12 for rollout.
