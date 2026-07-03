# Release Notes — OrderSDK Read API v1.0.0

**Tag:** `orders-sdk-read-v1.0`  
**Date:** 2026-06-26  
**Authority:** ADR-013

---

## Summary

First **stable, read-only** release of OrderSDK. Public contracts are frozen for external-style consumption. No new features; documentation and version metadata only.

---

## What's included

### Public API (frozen)

| Method | Description |
|--------|-------------|
| `getOrderById` | Single order read with optional bearer/guest context |
| `listOrdersForUser` | Customer-scoped order list |
| `listOrdersForTenant` | Owner-scoped tenant order list |
| `requestGuestViewToken` | Guest JWT after phone verification (ADR-012) |

### Types (frozen)

- `OrderReadModel`, `OrderLineItemReadModel`  
- `OrderListFilter`, `OrderTenantListFilter`, `OrderAccessContext`  
- `GuestViewTokenInput`, `GuestViewTokenResult`  
- Branded: `OrderId`, `UserId`, `TenantId`, `IsoDateTime`  
- `SdkResult`, `SdkError`, `SdkErrorCode`  

### Version exports

```typescript
ORDER_SDK_READ_API_VERSION  // '1.0.0'
ORDER_SDK_READ_API_FROZEN   // true
```

---

## What's NOT included

- Write SDK (`createOrder`, status updates)  
- Checkout migration  
- RealtimeProvider UI wiring  
- Production feature-flag rollout (flags default OFF)  

---

## Documentation

| Document | Path |
|----------|------|
| API Reference | `docs/sdk/v1.0/API-REFERENCE.md` |
| Public Interfaces | `docs/sdk/v1.0/PUBLIC-INTERFACES.md` |
| DTO Reference | `docs/sdk/v1.0/DTO-REFERENCE.md` |
| Error Catalogue | `docs/sdk/v1.0/ERROR-CATALOGUE.md` |
| Result Types | `docs/sdk/v1.0/RESULT-TYPES.md` |
| Versioning Policy | `docs/sdk/v1.0/VERSIONING-POLICY.md` |
| Compatibility Rules | `docs/sdk/v1.0/COMPATIBILITY-RULES.md` |
| Breaking Change Policy | `docs/sdk/v1.0/BREAKING-CHANGE-POLICY.md` |
| Migration Guide | `docs/sdk/v1.0/MIGRATION-GUIDE.md` |
| ADR | `docs/adr/ADR-013-order-sdk-read-v1-freeze.md` |

---

## Pre-tag checklist

- [x] Public methods documented  
- [x] DTOs documented  
- [x] Error catalogue published  
- [x] Version constant added  
- [x] ADR-013 accepted  
- [x] SDK tests pass (`npm run test:sdk`)  
- [ ] **72h staging soak** with all SDK flags ON (recommended before prod tag)  
- [ ] Git tag `orders-sdk-read-v1.0` applied  

---

## Upgrade notes

No breaking changes from pre-freeze scaffold — this release **defines** stability. Consumers should pin to `orders-sdk-read-v1.0` and assert `ORDER_SDK_READ_API_VERSION === '1.0.0'`.

See [Migration Guide](../sdk/v1.0/MIGRATION-GUIDE.md).

---

## Known limitations

1. Logged-in OrderTracking still uses Firestore realtime (not SDK).  
2. OwnerOrders uses hybrid: Firestore snapshot trigger + SDK read-model mapping.  
3. Passthrough DTO fields exist for UI parity during strangler migration.  
4. `OrderAccessContext` forwarding in adapter is partial (documented, not changed in freeze).  

---

*v1.0.0 — OrderSDK Read API freeze. No runtime changes.*
