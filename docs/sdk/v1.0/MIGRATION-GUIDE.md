# OrderSDK Read API v1.0.0 — Migration Guide

For teams moving presentation code from direct Firestore/API imports to OrderSDK.

---

## Prerequisites

- ADR-011 strangler pattern understood  
- Feature flag for target screen identified  
- Read API v1.0.0 docs in `docs/sdk/v1.0/`  

---

## Step 1: Import from SDK entry only

```typescript
// Before (forbidden for new code)
import { fetchOrderById } from '@/services/api';

// After
import { createOrderSDK } from '@/sdk';
import type { OrderId } from '@/sdk';

const sdk = createOrderSDK();
const result = await sdk.getOrderById(orderId as OrderId, { guestToken });
```

---

## Step 2: Replace throw/catch with result branching

```typescript
// Before
try {
  const order = await fetchOrderById(id);
} catch (e) { ... }

// After
const result = await sdk.getOrderById(id as OrderId);
if (!result.ok) {
  handleSdkError(result.error);
  return;
}
const order = result.value;
```

---

## Step 3: Map read model to UI types

Presentation facades handle mapping:

| Screen | Facade | Mapper |
|--------|--------|--------|
| OrderTracking | `src/lib/orderTrackingReads.ts` | inline / read model |
| MyOrders | `src/lib/myOrdersReads.ts` | `readModelToOrder` |
| OwnerOrders | `src/lib/ownerOrdersReads.ts` | `readModelToOwnerOrder` |

Prefer extending facades over duplicating SDK calls in components.

---

## Step 4: Enable feature flag (staging first)

| Flag | Env var |
|------|---------|
| OrderTracking | `VITE_FF_SDK_ORDERTRACKING_ENABLED=true` |
| MyOrders | `VITE_FF_SDK_MYORDERS_ENABLED=true` |
| OwnerOrders | `VITE_FF_SDK_OWNER_ORDERS_ENABLED=true` |

**Recommended:** 72h staging soak with all three ON before production.

---

## Step 5: Status enum migration

SDK returns normalized uppercase `OrderStatus`. UI code comparing legacy lowercase strings must use normalized values or facade mappers.

| Legacy | SDK |
|--------|-----|
| `placed` | `PENDING` |
| `pending_payment` | `PAYMENT_PENDING` |
| `preparing` | `PREPARING` |

---

## Guest flow (ADR-012)

1. `requestGuestViewToken(orderId, { phoneLast4 })`  
2. Store `result.value.token`  
3. Pass `{ guestToken: token }` to `getOrderById`  

---

## What stays on Firestore (v1.0.0)

- OrderTracking logged-in `onSnapshot` (realtime)  
- OwnerOrders list trigger (single snapshot + SDK mapping)  
- All writes (checkout, status updates, stock)  

Do **not** migrate writes in v1.0.0.

---

## Rollback

Set feature flag to `false` (default). Facades fall back to legacy Firestore/API paths with no SDK contract change.

---

## Upgrading from pre-1.0 scaffold

If using internal scaffold before freeze:

1. Pin to tag `orders-sdk-read-v1.0`  
2. Import `ORDER_SDK_READ_API_VERSION` to assert `'1.0.0'`  
3. Review passthrough fields in [DTO-REFERENCE.md](./DTO-REFERENCE.md)  

---

*Migration guide for OrderSDK Read API v1.0.0.*
