# OrderSDK Realtime Providers (M1 PR-6)

**Status:** Scaffolding only — not wired to presentation  
**Authority:** ADR-011 SDK Strangler Pattern

## Purpose

Abstract order **realtime subscriptions** behind a strategy interface so presentation can migrate from ad-hoc polling/Firestore listeners to a single SDK contract.

PR-6 introduces the interface and **PollingProvider** only. No Firestore listeners, SSE, or WebSockets are implemented.

## Strategy pattern

```
Presentation (future PR-7+)
        │
        ▼
 RealtimeProvider  ◄─── interface (strategy)
        │
   ┌────┴────┬────────────┬────────────┐
   ▼         ▼            ▼            ▼
Polling   Firestore      SSE       WebSocket
(PR-6)    (future)      (future)    (future)
   │
   ▼
 OrderSDK (read adapter)
   │
   ▼
 api.ts / infrastructure
```

## Files

| File | Role |
|------|------|
| `types.ts` | Subscription options, config, handler types |
| `RealtimeProvider.ts` | Strategy interface |
| `PollingProvider.ts` | Polls `OrderSDK.getOrderById` / `listOrdersForUser` |
| `ProviderFactory.ts` | Returns `PollingProvider` by default |

## Usage (future — not active in PR-6)

```typescript
import { createOrderSDK } from '@/sdk/orders/createOrderSDK';
import { createOrderRealtimeProvider } from '@/sdk/orders/realtime/ProviderFactory';

const sdk = createOrderSDK();
const realtime = createOrderRealtimeProvider(sdk); // kind: 'polling'

const unsubscribe = realtime.subscribeOrderList(
  { userId: 'uid-123' },
  (orders) => console.log(orders.length),
);

// later
unsubscribe();
```

## Factory behaviour

| `kind` | PR-6 |
|--------|------|
| `polling` (default) | ✅ `PollingProvider` |
| `firestore` | ❌ throws |
| `sse` | ❌ throws |
| `websocket` | ❌ throws |

## Rules

1. Realtime modules must not import `firebase/*`, `axios`, or open WebSocket/SSE connections in PR-6.
2. `PollingProvider` depends only on the `OrderSDK` interface — not on `OrderApiAdapter` directly.
3. Presentation must not import this module until a dedicated migration PR (PR-7+).
4. Default poll interval: **30 seconds** (matches PR-5 MyOrders SDK path).

## References

- `docs/m1/PR-6-REALTIME-PROVIDER-REPORT.md`
- `docs/m1/SDK-COVERAGE-DASHBOARD.md`
- ADR-011 SDK Strangler Pattern
