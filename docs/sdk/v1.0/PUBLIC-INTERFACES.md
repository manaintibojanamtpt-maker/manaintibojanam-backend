# OrderSDK Read API v1.0.0 — Public Interfaces

**Frozen surface.** Only symbols listed here are guaranteed stable under semver rules for the read API.

---

## Core entry

| Export | Kind | Path |
|--------|------|------|
| `createOrderSDK` | function | `src/sdk/orders/createOrderSDK.ts` |
| `orderSdkFactory` | `OrderSDKFactory` | `src/sdk/orders/createOrderSDK.ts` |
| `ORDER_SDK_READ_API_VERSION` | `'1.0.0'` | `src/sdk/orders/version.ts` |
| `ORDER_SDK_READ_API_FROZEN` | `true` | `src/sdk/orders/version.ts` |

---

## OrderSDK (interface)

```typescript
interface OrderSDK {
  getOrderById(
    orderId: OrderId,
    context?: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel>;

  listOrdersForUser(
    filter: OrderListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;

  listOrdersForTenant(
    filter: OrderTenantListFilter,
    context: OrderAccessContext
  ): SdkAsyncResult<OrderReadModel[]>;

  requestGuestViewToken(
    orderId: OrderId,
    input: GuestViewTokenInput
  ): SdkAsyncResult<GuestViewTokenResult>;
}
```

```typescript
interface OrderSDKFactory {
  create(): OrderSDK;
}
```

---

## Branded identifiers (v1.0.0)

| Type | Brand | Usage |
|------|-------|-------|
| `OrderId` | `OrderId` | Single-order reads, guest token |
| `UserId` | `UserId` | Customer list filter |
| `TenantId` | `TenantId` | Owner list filter, read model |
| `IsoDateTime` | `IsoDateTime` | Timestamps in read models |

Cast at boundaries: `'abc' as OrderId`

---

## Filter & context types

```typescript
interface OrderAccessContext {
  readonly bearerToken?: string;
  readonly guestToken?: string;
}

interface OrderListFilter {
  readonly userId?: UserId;
  readonly tenantId?: TenantId;
  readonly limit?: number;
}

interface OrderTenantListFilter {
  readonly tenantId: TenantId;
  readonly limit?: number;
}

interface GuestViewTokenInput {
  readonly phone?: string;
  readonly phoneLast4?: string;
}
```

---

## Result & error types

```typescript
type SdkAsyncResult<T> = Promise<SdkResult<T>>;

type SdkResult<T> = SdkSuccess<T> | SdkFailure;

type SdkSuccess<T> = { readonly ok: true; readonly value: T };

type SdkFailure = { readonly ok: false; readonly error: SdkError };

interface SdkError {
  readonly code: SdkErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}
```

See [ERROR-CATALOGUE.md](./ERROR-CATALOGUE.md) and [RESULT-TYPES.md](./RESULT-TYPES.md).

---

## Read model (summary)

Primary DTO: `OrderReadModel` — see [DTO-REFERENCE.md](./DTO-REFERENCE.md).

Line items: `OrderLineItemReadModel`

Enums: `OrderStatus`, `PaymentMethod`, `PaymentStatus`

---

## Explicitly NOT frozen in v1.0.0

The following are exported from `src/sdk/index.ts` but are **not** part of OrderSDK Read API v1.0.0:

| Symbol | Status |
|--------|--------|
| `RealtimeProvider`, `PollingProvider` | Beta companion module |
| `OrderApiAdapter`, `OrderApiPort` | Internal adapter (may evolve) |
| `mapOrderToReadModel` | Mapper utility (patch-level stable) |
| `defaultOrderApiPort` | Infrastructure binding |
| `SDK_VERSION` (`0.1.0-scaffold`) | Whole-package scaffold version |

Consumers integrating **only** the read API should depend on `OrderSDK` + DTOs + `ORDER_SDK_READ_API_VERSION`.

---

*OrderSDK Read API v1.0.0 — frozen public interfaces.*
