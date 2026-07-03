# Order API Adapter (M1 PR-3)

**Implementation:** `OrderApiAdapter.ts`  
**Authority:** ADR-011 Strangler Pattern

## Purpose

Read-only OrderSDK that **wraps** existing `src/services/api.ts` helpers without modifying their behavior.

## Delegation map

| OrderSDK method | api.ts function | Notes |
|-----------------|-----------------|-------|
| `getOrderById` | `fetchOrderByIdApi` | Guest token via sessionStorage (existing client behavior) |
| `listOrdersForUser` | `fetchOrders(userId)` | Optional tenant/limit applied in adapter after fetch |
| `requestGuestViewToken` | `requestGuestViewToken` | ADR-012 phone verification |

## Port / test doubles

Inject `OrderApiPort` for unit tests:

```typescript
import { createOrderApiAdapter } from '@/sdk';

const adapter = createOrderApiAdapter(mockPort);
```

Production default: `defaultOrderApiPort` → `src/services/api.ts`.

## Not in scope (PR-3)

- Write operations (`createOrder`, status updates)
- Realtime listeners (`subscribeToOrder`, `subscribeToOrders`)
- UI migration (PR-4+)
- Direct Firestore access from SDK files

## Feature flags

SDK remains off by default (`FF_SDK_ORDER_READ=false`). Adapter is available but **not imported by presentation** until PR-4.

## Parity guarantee

Unit tests assert `OrderApiAdapter` output equals `mapOrderToReadModel(apiRecord)` for the same underlying api.ts data.
