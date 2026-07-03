# OrderSDK Read API v1.0.0 — Certification Report

**Certification ID:** BHOS-ORDERSDK-v1.0-FREEZE  
**Date:** 2026-06-26  
**Status:** ✅ **APPROVED** (conditional production tag)  
**Read API Version:** 1.0.0  
**Recommended Tag:** `orders-sdk-read-v1.0`

---

## Executive Summary

The Architecture Review Board approves **freezing OrderSDK Read API at v1.0.0**. All four public read methods are implemented, tested, and documented. This certification PR introduces **no runtime behavior changes** — only version metadata, contract documentation, and ADR-013.

**Conditional:** Apply git tag and enable production feature flags only after **72h staging soak** with `FF_SDK_ORDERTRACKING_ENABLED`, `FF_SDK_MYORDERS_ENABLED`, and `FF_SDK_OWNER_ORDERS_ENABLED` all ON.

---

## Verification Matrix

### Public methods

| Method | Signature | Adapter | Tests | Docs |
|--------|-----------|---------|-------|------|
| `getOrderById` | ✅ Frozen | ✅ OrderApiAdapter | ✅ | ✅ |
| `listOrdersForUser` | ✅ Frozen | ✅ OrderApiAdapter | ✅ | ✅ |
| `listOrdersForTenant` | ✅ Frozen | ✅ OrderApiAdapter | ✅ | ✅ |
| `requestGuestViewToken` | ✅ Frozen | ✅ OrderApiAdapter | ✅ | ✅ |

### DTOs & branded IDs

| Artifact | Status |
|----------|--------|
| `OrderReadModel` | ✅ Documented (core + passthrough) |
| `OrderLineItemReadModel` | ✅ |
| Filters & context types | ✅ |
| `OrderId`, `UserId`, `TenantId`, `IsoDateTime` | ✅ |
| Status normalization | ✅ Documented |

### Result & error types

| Artifact | Status |
|----------|--------|
| `SdkResult<T>` / `SdkAsyncResult<T>` | ✅ Frozen |
| `SdkErrorCode` (9 codes) | ✅ Catalogued |
| No-throw boundary | ✅ Verified |

### Contracts & versioning

| Item | Status |
|------|--------|
| `ORDER_SDK_READ_API_VERSION` | ✅ `1.0.0` |
| Versioning policy | ✅ Published |
| Breaking change policy | ✅ Published |
| Compatibility matrix | ✅ Published |
| ADR-013 | ✅ Accepted |

---

## Test Evidence

| Suite | Result (pre-freeze baseline) |
|-------|------------------------------|
| `npm run test:sdk` | 41/41 pass |
| `npm run test:smoke` | 22/22 pass |
| Facade tests | orderTrackingReads, myOrdersReads, ownerOrdersReads |

---

## Consumer coverage

| Consumer | Read methods used | Flag |
|----------|-------------------|------|
| OrderTracking | `getOrderById`, `requestGuestViewToken` | `FF_SDK_ORDERTRACKING_ENABLED` |
| MyOrders | `listOrdersForUser`, `getOrderById` | `FF_SDK_MYORDERS_ENABLED` |
| OwnerOrders | `listOrdersForTenant`, `getOrderById` | `FF_SDK_OWNER_ORDERS_ENABLED` |

All flags default **OFF**.

---

## Out of scope (confirmed not in v1.0.0)

- Write methods  
- Checkout / payments / menu / inventory / notifications  
- RealtimeProvider UI wiring  
- Adapter / Firestore / API / UI modifications in freeze PR  

---

## Findings (documented, not fixed in freeze)

| ID | Finding | Severity | Action |
|----|---------|----------|--------|
| F-01 | Hybrid HTTP/Firestore transport | Info | Deferred to M2 unified port |
| F-02 | Passthrough-heavy read model | Low | Documented; refine in v1.x minor |
| F-03 | RealtimeProvider unwired | Info | Beta companion, not v1.0 |
| F-04 | Three facades with similar patterns | Low | Consolidate post-v1.0 |
| F-05 | Missing `OrderTenantListFilter` import in OrderSDK.ts | Low | Fixed (type-only, no runtime change) |

---

## Compatibility Matrix

| From → To | v1.0.0 | v1.x (future minor) | v2.0 (future major) |
|-----------|--------|---------------------|---------------------|
| v1.0.0 consumer | — | Compatible (additive) | Requires migration guide |
| Pre-scaffold internal | Compatible | Compatible | TBD |

---

## Versioning Strategy

- **1.0.0** — Read API freeze (this release)  
- **1.x.0** — Additive optional fields/methods only  
- **1.0.x** — Bug fixes only  
- **2.0.0** — Breaking changes; requires ADR + board approval  

---

## Tag Recommendation

```bash
git tag -a orders-sdk-read-v1.0 -m "OrderSDK Read API v1.0.0 — frozen public contract (ADR-013)"
```

Apply after staging soak and maintainer sign-off. **Do not push tag automatically.**

---

## Sign-off

| Role | Decision |
|------|----------|
| Architecture Review Board | ✅ Approved |
| SDK Maintainer | ✅ Contracts complete |
| Production tag | ⏳ Pending 72h staging soak |

---

## Deliverables checklist

- [x] OrderSDK API Reference  
- [x] Public Interfaces  
- [x] DTO Reference  
- [x] Error Catalogue  
- [x] Result Types  
- [x] Versioning Policy  
- [x] Compatibility Rules  
- [x] Breaking Change Policy  
- [x] Migration Guide  
- [x] SDK README updated  
- [x] ADR-013 (freeze; ADR-012 = guest access)  
- [x] Release notes `orders-sdk-read-v1.0`  
- [x] Certification report (this document)  

---

**STOP.** No further implementation. Await staging soak and tag approval.

---

*BHOS-ORDERSDK-v1.0-FREEZE — Certification complete.*
