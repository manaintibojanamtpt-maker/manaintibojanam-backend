# OrderSDK Read API v1.0.0 — Error Catalogue

All OrderSDK read methods return `SdkResult<T>` — **never throw** at the public boundary.

---

## SdkError shape

```typescript
interface SdkError {
  readonly code: SdkErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}
```

---

## SdkErrorCode (v1.0.0 frozen)

| Code | HTTP analog | When returned |
|------|-------------|---------------|
| `NOT_FOUND` | 404 | Order missing or guest token rejected |
| `UNAUTHORIZED` | 401 | Missing/invalid bearer or guest credentials |
| `FORBIDDEN` | 403 | Authenticated but not permitted |
| `VALIDATION` | 400 | Missing required filter fields (userId, tenantId, phone) |
| `CONFLICT` | 409 | Reserved for future write API |
| `RATE_LIMITED` | 429 | Reserved / upstream throttle |
| `UNAVAILABLE` | 503 | Network or service unreachable |
| `INTERNAL` | 500 | Unexpected adapter or port failure |
| `NOT_CONFIGURED` | — | Port missing optional capability (e.g. tenant list) |

---

## Method → error mapping

### getOrderById

| Code | Typical cause |
|------|---------------|
| `NOT_FOUND` | Invalid order ID or guest verify failed |
| `UNAUTHORIZED` | Guest token expired or invalid |
| `INTERNAL` | Port returned null/undefined unexpectedly |
| `UNAVAILABLE` | HTTP/Firestore transport failure |

### listOrdersForUser

| Code | Typical cause |
|------|---------------|
| `VALIDATION` | `filter.userId` missing |
| `INTERNAL` | Port returned non-array |
| `UNAVAILABLE` | Transport failure |

### listOrdersForTenant

| Code | Typical cause |
|------|---------------|
| `VALIDATION` | `filter.tenantId` missing |
| `NOT_CONFIGURED` | `fetchOrdersByTenant` not on port |
| `INTERNAL` | Port returned non-array |
| `UNAVAILABLE` | Transport failure |

### requestGuestViewToken

| Code | Typical cause |
|------|---------------|
| `VALIDATION` | Neither `phone` nor `phoneLast4` provided |
| `NOT_FOUND` | Order not found or phone mismatch |
| `UNAUTHORIZED` | Verification rejected |
| `INTERNAL` | Token issuance failed |

---

## Handling pattern

```typescript
const result = await sdk.getOrderById(orderId, context);

if (!result.ok) {
  switch (result.error.code) {
    case 'NOT_FOUND':
      // show 404 UI
      break;
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
      // redirect to login or guest verify
      break;
    case 'UNAVAILABLE':
      // retry with backoff
      break;
    default:
      // generic error
  }
  return;
}

// use result.value
```

---

## details field

Optional `details` may include:

- `orderId` — on NOT_FOUND from getOrderById  
- `cause` — stringified underlying error (INTERNAL only)  
- Upstream HTTP status (when mapped by adapter)

**Do not** depend on `details` keys in v1.0.0 — they are diagnostic only and may change in patch releases.

---

*Error codes frozen at v1.0.0. New codes require minor version + documentation.*
