# Order Projection Parity (M6 PR-8)

Validates that the shadow order read projection is functionally identical to the legacy order read model.

## Architecture

```
Legacy Order Document → OrderParityMapper → Canonical Legacy View
Projection Read Model → OrderParityMapper → Canonical Projection View
  ↓
OrderParityComparator
  ↓
OrderParityReport
  ↓
STOP — OrderSDK reads legacy source
```

## Feature Flags (ALL required, default OFF)

- `FF_EVENT_PLATFORM_ENABLED`
- `FF_EVENT_PROJECTION_ENABLED`
- `FF_EVENT_PROJECTION_RUNTIME_ENABLED`
- `FF_ORDER_READ_PROJECTION_ENABLED`
- `FF_ORDER_PROJECTION_PARITY_ENABLED`

## Usage

```typescript
import { createOrderParityInfrastructure } from '@/sdk/events/parity/order/OrderParityFactory';

const infra = createOrderParityInfrastructure({ featureFlags });
const report = await infra.compareAndReport('order-001');
```

**STOP.** No adapter switch. Await ARB approval before PR-9.
