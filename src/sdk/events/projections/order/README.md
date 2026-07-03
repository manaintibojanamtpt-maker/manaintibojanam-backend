# Order Read Projection (M6 PR-7)

First business read projection — **shadow only**.

## Architecture

```
Legacy Order Write (authoritative)
  ↓
Shadow Event (PR-5)
  ↓
Outbox
  ↓
OrderProjectionWorker
  ↓
OrderProjectionRepository (in-memory)
  ↓
STOP — OrderSDK reads legacy source
```

## Events Consumed

- `order.created.v1`
- `order.updated.v1`
- `order.cancelled.v1`

## Read Model

`orderId`, `tenantId`, `status`, `branchId`, `customerId`, `totalAmount`, `currency`, `createdAt`, `updatedAt`, `version`, `projectionVersion`

No PII. No phone. No email.

## Feature Flags (ALL required, default OFF)

- `FF_EVENT_PLATFORM_ENABLED`
- `FF_EVENT_PROJECTION_ENABLED`
- `FF_EVENT_PROJECTION_RUNTIME_ENABLED`
- `FF_ORDER_READ_PROJECTION_ENABLED`

## Usage

```typescript
import { createOrderProjectionWorkerBundle } from '@/sdk/events/projections/order/createOrderProjectionWorker';

const bundle = createOrderProjectionWorkerBundle({ featureFlags });
const result = await bundle.worker.process(orderCreatedEnvelope);
```

**STOP.** No OrderSDK integration. Await ARB approval before PR-8.
