# OrderSDK Read API — Compatibility Rules

**Read API version:** 1.0.0

---

## Consumer compatibility matrix

| Consumer | SDK methods | Flag | Transport (flag ON) |
|----------|-------------|------|---------------------|
| OrderTracking (guest read) | `getOrderById`, `requestGuestViewToken` | `FF_SDK_ORDERTRACKING_ENABLED` | HTTP + guest JWT |
| OrderTracking (logged-in) | — (Firestore direct) | — | Not on SDK v1.0 path |
| MyOrders | `listOrdersForUser`, `getOrderById` | `FF_SDK_MYORDERS_ENABLED` | Firestore list + HTTP detail |
| OwnerOrders | `listOrdersForTenant`, `getOrderById` | `FF_SDK_OWNER_ORDERS_ENABLED` | Firestore tenant query |

---

## Backward compatibility (v1.0.0 → v1.x)

| Change type | Compatible? |
|-------------|-------------|
| Add optional field to `OrderReadModel` | Yes (minor) |
| Add new read method | Yes (minor) — not in v1.0.0 freeze |
| Normalize additional legacy status string | Yes (patch) |
| Remove passthrough field | **No** (major) |
| Change `OrderReadModel.id` type | **No** (major) |
| Change `SdkResult` discriminant | **No** (major) |
| Require new filter field | **No** (major) |

---

## Adapter compatibility

`OrderApiAdapter` is **not** part of the frozen consumer contract. Internal ports may gain methods without read API major bump, provided `OrderSDK` behavior is unchanged.

---

## RealtimeProvider

`PollingProvider` / `RealtimeProvider` are **beta companion** modules. They are not semver-guaranteed under OrderSDK Read API v1.0.0.

---

## Node / TypeScript

- TypeScript ≥ 5.x (project standard)  
- ESM imports via `@/sdk` alias  
- Branded types require `as OrderId` casts at string boundaries  

---

## Test compatibility

Certification baseline: `npm run test:sdk` (41 tests), `npm run test:smoke` (22 tests).

---

*Compatibility rules frozen with v1.0.0.*
