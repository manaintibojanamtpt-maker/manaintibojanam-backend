# OrderSDK Read API v1.0.0 — API Reference

**Version:** 1.0.0 (frozen)  
**Status:** Stable  
**Authority:** ADR-013, ADR-011, BHOS-000  
**Package entry:** `src/sdk/index.ts`

---

## Overview

OrderSDK Read API v1.0.0 is the **first stable, read-only** contract for order data in BhojanOS. It is designed for presentation-layer consumption via the strangler pattern (ADR-011).

**In scope (v1.0.0):**

- Read single order by ID  
- List orders for authenticated user (customer scope)  
- List orders for tenant (owner scope)  
- Issue guest view token after phone verification  

**Out of scope (v1.0.0):**

- Write operations (create, update, cancel)  
- Payments, menu, inventory, notifications  
- Realtime subscriptions (`RealtimeProvider` is companion beta, not part of this freeze)  

---

## Factory

```typescript
import { createOrderSDK, orderSdkFactory } from '@/sdk';
import type { OrderSDK } from '@/sdk';

const orders: OrderSDK = createOrderSDK();
// equivalent: orderSdkFactory.create()
```

Custom adapter port (advanced):

```typescript
import { createOrderSDK } from '@/sdk';
import type { OrderApiPort } from '@/sdk';

const orders = createOrderSDK(customPort);
```

---

## Public Methods

### `getOrderById`

```typescript
getOrderById(
  orderId: OrderId,
  context?: OrderAccessContext
): SdkAsyncResult<OrderReadModel>
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orderId` | `OrderId` | Yes | Branded order identifier |
| `context` | `OrderAccessContext` | No | Bearer token and/or guest JWT |

**Success:** `SdkSuccess<OrderReadModel>`  
**Failure codes:** `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `INTERNAL`, `UNAVAILABLE`

**Example:**

```typescript
import { createOrderSDK } from '@/sdk';
import type { OrderId } from '@/sdk';

const sdk = createOrderSDK();
const result = await sdk.getOrderById('ord_abc123' as OrderId, {
  guestToken: storedGuestJwt,
});

if (result.ok) {
  console.log(result.value.status, result.value.totalAmount);
} else {
  console.error(result.error.code, result.error.message);
}
```

---

### `listOrdersForUser`

```typescript
listOrdersForUser(
  filter: OrderListFilter,
  context: OrderAccessContext
): SdkAsyncResult<OrderReadModel[]>
```

| Filter field | Type | Required | Description |
|--------------|------|----------|-------------|
| `userId` | `UserId` | Yes | Authenticated customer UID |
| `tenantId` | `TenantId` | No | Post-fetch tenant filter |
| `limit` | `number` | No | Max items returned |

**Failure codes:** `VALIDATION` (missing userId), `INTERNAL`, `UNAVAILABLE`

**Example:**

```typescript
const result = await sdk.listOrdersForUser(
  { userId: 'uid_customer' as UserId, limit: 50 },
  { bearerToken: idToken }
);
```

---

### `listOrdersForTenant`

```typescript
listOrdersForTenant(
  filter: OrderTenantListFilter,
  context: OrderAccessContext
): SdkAsyncResult<OrderReadModel[]>
```

| Filter field | Type | Required | Description |
|--------------|------|----------|-------------|
| `tenantId` | `TenantId` | Yes | Owner kitchen tenant ID |
| `limit` | `number` | No | Max items returned (newest first) |

**Failure codes:** `VALIDATION`, `NOT_CONFIGURED` (port lacks tenant fetch), `INTERNAL`

**Example:**

```typescript
const result = await sdk.listOrdersForTenant(
  { tenantId: 'tenant_mana' as TenantId, limit: 50 },
  { bearerToken: ownerIdToken }
);
```

---

### `requestGuestViewToken`

```typescript
requestGuestViewToken(
  orderId: OrderId,
  input: GuestViewTokenInput
): SdkAsyncResult<GuestViewTokenResult>
```

| Input field | Type | Required | Description |
|-------------|------|----------|-------------|
| `phone` | `string` | One of | Full phone used at checkout |
| `phoneLast4` | `string` | One of | Last four digits verification |

**Success:** `{ token: string, expiresAt: IsoDateTime }`  
**Failure codes:** `VALIDATION`, `NOT_FOUND`, `UNAUTHORIZED`, `INTERNAL`

**Example:**

```typescript
const result = await sdk.requestGuestViewToken('ord_abc123' as OrderId, {
  phoneLast4: '3210',
});
```

---

## Version Constant

```typescript
import { ORDER_SDK_READ_API_VERSION } from '@/sdk';
// '1.0.0'
```

---

## Related Documents

- [Public Interfaces](./PUBLIC-INTERFACES.md)  
- [DTO Reference](./DTO-REFERENCE.md)  
- [Error Catalogue](./ERROR-CATALOGUE.md)  
- [Result Types](./RESULT-TYPES.md)  
- [Versioning Policy](./VERSIONING-POLICY.md)  
- [Migration Guide](./MIGRATION-GUIDE.md)  

---

*Frozen 2026-06-26. Breaking changes require ADR + major version bump.*
