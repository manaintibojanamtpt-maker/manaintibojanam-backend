# OrderSDK Read API v1.0.0 — Result Types

OrderSDK uses **explicit result types** instead of exceptions at the public boundary (BHOS-TDD-001).

---

## Types

```typescript
type SdkSuccess<T> = {
  readonly ok: true;
  readonly value: T;
};

type SdkFailure = {
  readonly ok: false;
  readonly error: SdkError;
};

type SdkResult<T> = SdkSuccess<T> | SdkFailure;

type SdkAsyncResult<T> = Promise<SdkResult<T>>;
```

---

## Type guards

```typescript
import { isSdkSuccess } from '@/sdk';

const result = await sdk.getOrderById(orderId);
if (isSdkSuccess(result)) {
  // result.value: OrderReadModel
} else {
  // result.error: SdkError
}
```

---

## Helpers (v1.0.0)

| Export | Purpose |
|--------|---------|
| `sdkOk(value)` | Construct success |
| `sdkFail(error)` | Construct failure |
| `sdkError(code, message, details?)` | Build SdkError + fail |
| `sdkFromError(err, fallbackCode?)` | Map unknown to SdkFailure |
| `isSdkSuccess(result)` | Narrow SdkResult |

Adapter implementations use these; presentation code typically only consumes results.

---

## Method return types

| Method | Success type |
|--------|--------------|
| `getOrderById` | `OrderReadModel` |
| `listOrdersForUser` | `OrderReadModel[]` |
| `listOrdersForTenant` | `OrderReadModel[]` |
| `requestGuestViewToken` | `GuestViewTokenResult` |

All return `SdkAsyncResult<T>`.

---

## Design rules (frozen)

1. **No throw** from `OrderSDK` interface methods.  
2. **Discriminated union** via `ok: true | false`.  
3. **Immutable** success/failure objects (`readonly`).  
4. Presentation must branch on `result.ok`, not try/catch for SDK calls.

---

*Result type shape frozen at v1.0.0.*
