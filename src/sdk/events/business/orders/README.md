# Order Business Shadow Events (M6 PR-5)

First business event producer — **shadow publishing only**.

## Architecture

```
Legacy Order Creation
  ↓
Legacy Firestore Write (authoritative)
  ↓
OrderShadowPublisher
  ↓
ShadowPublisher → Outbox (pending)
  ↓
STOP — no subscribers, no projections
```

## Events

| Event | Method |
|-------|--------|
| `order.created.v1` | `publishOrderCreated()` |
| `order.updated.v1` | `publishOrderUpdated()` |
| `order.cancelled.v1` | `publishOrderCancelled()` |

## Feature Flags (ALL required, default OFF)

- `FF_EVENT_PLATFORM_ENABLED`
- `FF_EVENT_OUTBOX_ENABLED`
- `FF_EVENT_SHADOW_PUBLISHING_ENABLED`
- `FF_ORDER_SHADOW_EVENTS_ENABLED`

## Usage

```typescript
import { createOrderShadowPublisherFactory } from '@/sdk/events/business/orders/createOrderShadowPublisher';

const shadowPublisher = createOrderShadowPublisherFactory({ outboxRepository, featureFlags });
const outcome = await shadowPublisher.publishOrderCreated(legacyOrder, { correlationId });
// outcome.published may be false — never fails order creation
```

**STOP.** No runtime wiring in PR-5. Await ARB approval before integration.
