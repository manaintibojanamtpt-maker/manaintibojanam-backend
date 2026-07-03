# BhojanOS SDK (`src/sdk`)

**OrderSDK Read API:** v1.0.0 (frozen) — see [docs/sdk/README.md](../../docs/sdk/README.md)  
**LocationSDK:** v1.0.0-foundation (contracts only, M2 PR-2) — see [src/sdk/location/README.md](./location/README.md)  
**ReferenceSDK:** v1.0.0-foundation — static adapter (M2 PR-5) — see [src/sdk/reference/README.md](./reference/README.md)  
**Package scaffold:** `SDK_VERSION = '0.1.0-scaffold'`  
**Authority:** ADR-013, ADR-011, BHOS-000

---

## Purpose

The SDK is the **only supported boundary** between Presentation and Platform/Infrastructure (ADR-011 strangler pattern).

---

## OrderSDK Read API v1.0.0 (stable)

Frozen read-only surface for external-style consumers:

| Method | Scope |
|--------|-------|
| `getOrderById` | Single order |
| `listOrdersForUser` | Customer list |
| `listOrdersForTenant` | Owner tenant list |
| `requestGuestViewToken` | Guest JWT (ADR-012) |

```typescript
import { createOrderSDK, ORDER_SDK_READ_API_VERSION } from '@/sdk';
import type { OrderId } from '@/sdk';

console.assert(ORDER_SDK_READ_API_VERSION === '1.0.0');

const orders = createOrderSDK();
const result = await orders.getOrderById('ord_123' as OrderId);

if (result.ok) {
  // result.value: OrderReadModel
}
```

Full specification: [`docs/sdk/v1.0/API-REFERENCE.md`](../../docs/sdk/v1.0/API-REFERENCE.md)

---

## Layer flow

```
Presentation → SDK → Domain → Platform Services → Infrastructure
```

Presentation facades (behind feature flags):

| Facade | Flag |
|--------|------|
| `src/lib/orderTrackingReads.ts` | `FF_SDK_ORDERTRACKING_ENABLED` |
| `src/lib/myOrdersReads.ts` | `FF_SDK_MYORDERS_ENABLED` |
| `src/lib/ownerOrdersReads.ts` | `FF_SDK_OWNER_ORDERS_ENABLED` |

All flags default **OFF**.

---

## Structure

| Path | Role |
|------|------|
| `core/` | Result types, errors, feature flags, branded IDs |
| `orders/` | OrderSDK contract + read adapter |
| `orders/realtime/` | RealtimeProvider (beta — **not** part of v1.0 read freeze) |
| `orders/version.ts` | `ORDER_SDK_READ_API_VERSION` |
| `shared/` | Cross-module constants |

---

## Out of scope (v1.0.0)

- Write operations (create, update, cancel)  
- Checkout, payments, menu, inventory, notifications  
- RealtimeProvider UI wiring  

---

## Rules

1. SDK must not import `firebase/*`, `axios`, or `fetch`.  
2. Presentation must not import Firestore directly (`npm run lint:presentation`).  
3. Import from `@/sdk` — not from adapter internals.  
4. Breaking read API changes require ADR + major version bump.

---

## References

- [ADR-013 OrderSDK Read v1.0 Freeze](../../docs/adr/ADR-013-order-sdk-read-v1-freeze.md)  
- [ADR-011 SDK Strangler](../../docs/adr/ADR-011-sdk-strangler.md)  
- [ADR-012 Guest Order Access](../../docs/adr/ADR-012-guest-order-access.md)  
- [Certification Report](../../docs/sdk/ORDER-SDK-READ-v1.0-CERTIFICATION.md)  
- [Release Notes](../../docs/releases/orders-sdk-read-v1.0.md)  

---

*OrderSDK Read API v1.0.0 — frozen 2026-06-26.*
