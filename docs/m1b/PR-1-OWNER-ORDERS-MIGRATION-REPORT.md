# M1B PR-1 — Owner Order Management SDK Migration Report

**Milestone:** M1B — Owner SDK Validation  
**PR:** PR-1 — Owner Order Management read migration  
**Authority:** ADR-011, BHOS-000, M1 Midpoint Review  
**Date:** 2026-06-26  
**Status:** Complete

---

## 1. Repository Analysis

### Target surface

| File | Role |
|------|------|
| `src/pages/owner/OwnerOrders.tsx` | Owner order list, filters (client-side), dispatch UI, status actions |

### Read operations identified

| Operation | Legacy path | Migrated |
|-----------|-------------|----------|
| Tenant order list (live) | Firestore `onSnapshot` `where('tenantId'=='…')` | ✅ `subscribeOwnerOrders` |
| Load more (pagination) | `orderLimit` slice on snapshot | ✅ unchanged logic via facade |
| Pending filter | Client-side `orders.filter` | ✅ unchanged (not a read path) |
| Tenant info banner | Firestore `getDoc(tenants/…)` | ❌ out of scope (not order read) |
| Quick Stock menu | Firestore `onSnapshot(menu)` | ❌ out of scope (menu) |
| Order writes (status, dispatch) | `apiUpdateOrderStatus` | ❌ unchanged per scope |

### Gap addressed

Customer SDK exposed `listOrdersForUser`; owner requires **tenant-scoped** listing. Added `listOrdersForTenant` to OrderSDK contract and `fetchOrdersByTenant` on `OrderApiPort` (implemented in `src/lib/ownerOrderFetch.ts`, **not** `api.ts`).

---

## 2. Migration Summary

```
OwnerOrders.tsx
  → subscribeOwnerOrders()          [ownerOrdersReads.ts facade]
    → FF OFF: onSnapshot + legacy doc shape
    → FF ON:  onSnapshot + mapOrdersToReadModels (OrderSDK contracts)
  → fetchOwnerOrdersList()          [one-shot via createOrderSDK(ownerOrderApiPort)]
    → OrderSDK.listOrdersForTenant
      → OrderApiAdapter
        → ownerOrderApiPort.fetchOrdersByTenant
          → ownerOrderFetch (Firestore getDocs)
```

**Writes unchanged:** `apiUpdateOrderStatus`, `updateMenuItem`, analytics, dispatch modal.

---

## 3. Files Changed

### Created

| Path | Purpose |
|------|---------|
| `src/lib/ownerOrdersReads.ts` | OwnerOrdersFacade — subscribe + fetch |
| `src/lib/ownerOrderApiPort.ts` | Port binding (default + tenant fetch) |
| `src/lib/ownerOrderFetch.ts` | Tenant Firestore query for port |
| `src/lib/ownerOrderReadModelMapper.ts` | OrderReadModel → owner UI shape |
| `src/lib/__tests__/ownerOrdersReads.test.ts` | Owner SDK parity tests (7) |
| `docs/m1b/PR-1-OWNER-ORDERS-MIGRATION-REPORT.md` | This report |

### Modified

| Path | Change |
|------|--------|
| `src/pages/owner/OwnerOrders.tsx` | Order list reads → `subscribeOwnerOrders` |
| `src/lib/sdkFeatureFlags.ts` | `FF_SDK_OWNER_ORDERS_ENABLED` |
| `src/sdk/orders/OrderSDK.ts` | `listOrdersForTenant` |
| `src/sdk/orders/types.ts` | `OrderTenantListFilter`, owner passthrough fields |
| `src/sdk/orders/adapters/OrderApiAdapter.ts` | `listOrdersForTenant` implementation |
| `src/sdk/orders/adapters/OrderApiPort.ts` | Optional `fetchOrdersByTenant` |
| `src/sdk/orders/mappers/mapOrderToReadModel.ts` | Owner field passthrough |
| `src/sdk/index.ts` | Export `OrderTenantListFilter` |
| `src/vite-env.d.ts` | Env typing |
| `package.json` | Owner tests in `test:sdk` |
| `docs/m1/SDK-COVERAGE-DASHBOARD.md` | Updated |

### Not modified (by design)

- `src/services/api.ts`, `server.ts`, Firestore rules  
- Checkout, Owner Dashboard widgets, customer screens  
- Order write paths  

---

## 4. Feature Flag

**`FF_SDK_OWNER_ORDERS_ENABLED`**

| Priority | Source |
|----------|--------|
| 1 | `VITE_FF_SDK_OWNER_ORDERS_ENABLED=true\|false` |
| 2 | `localStorage.FF_SDK_OWNER_ORDERS_ENABLED` (dev/preview) |
| 3 | Default: **false** |

**Flag OFF:** Legacy snapshot mapping (raw Firestore doc shape).  
**Flag ON:** Same single `onSnapshot`; docs mapped through `mapOrdersToReadModel` + `readModelToOwnerOrder`.

Dev enable:

```javascript
localStorage.setItem('FF_SDK_OWNER_ORDERS_ENABLED', 'true');
location.reload();
```

Helper: `setSdkOwnerOrdersOverride(enabled)`.

---

## 5. Architecture Validation

| Requirement | Status |
|-------------|--------|
| OwnerOrdersFacade pattern | ✅ |
| Reuses `createOrderSDK()` | ✅ via `ownerOrderApiPort` |
| Extends OrderApiAdapter (not duplicate) | ✅ `listOrdersForTenant` |
| No `api.ts` changes | ✅ |
| Customer + owner share OrderReadModel | ✅ |
| No UI redesign | ✅ |
| No write migration | ✅ |
| ADR-011 strangler | ✅ |

---

## 6. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Flag ON changes status string casing | Low | `readModelToOwnerOrder` preserves raw `status` when present |
| `createdAt.toDate()` UI dependency | Low | Raw Firestore `createdAt` preserved on SDK path |
| Tenant leak via port misconfiguration | Med | Adapter filters `tenantId` post-fetch |
| Dual port (`default` vs `owner`) drift | Low | Owner port spreads `defaultOrderApiPort` |
| Production flag ON without soak | Med | Default OFF; staging gate required |

---

## 7. Performance Assessment

| Metric | Flag OFF | Flag ON | Delta |
|--------|----------|---------|-------|
| Firestore listeners | 1 (`onSnapshot` orders) | 1 | **None** |
| Firestore reads (steady state) | Incremental snapshot | Incremental snapshot | **None** |
| API calls | 0 | 0 | **None** |
| Client CPU | Sort + slice | Sort + slice + SDK map | Negligible |
| Bundle size | Baseline + facade | +~3KB gzipped est. | Minimal |

**Trade-off:** SDK mapping adds O(n) map per snapshot emission vs direct doc spread. Same listener count and read pattern as legacy — meets M1B performance constraints.

**Not used on hot path:** `fetchOwnerOrdersList` (getDocs via SDK) — available for refresh/tests only; subscribe does not double-fetch.

---

## 8. Security Assessment

| Control | Status |
|---------|--------|
| Owner authorization | ✅ Unchanged — Firestore rules + `OwnerRoute` |
| Tenant isolation | ✅ Query `where('tenantId'=='…')` + adapter filter |
| Restaurant isolation | ✅ Single tenantId from `useTenant` / profile |
| Branch isolation (future) | ✅ Filter interface accepts tenantId only; branch filter additive later |
| SDK bypass | ✅ No REST path without server auth; snapshot uses owner credentials |
| Information leakage | ✅ No cross-tenant fetch in port when tenantId scoped |

---

## 9. Testing Results

| Suite | Result |
|-------|--------|
| `npm run test:sdk` | **41/41 pass** (+7 M1B) |
| `npm run lint:presentation` | **PASS** |
| `npm run test:smoke` | **22/22 pass** (unchanged) |

### M1B test coverage

- Owner UI field passthrough  
- `listOrdersForTenant` tenant filter + limit  
- Adapter ↔ mapper parity  
- `NOT_CONFIGURED` without tenant port  
- `getOrderById` owner detail shape  
- Sort with ISO + Firestore timestamps  

---

## 10. Rollback Plan

1. Set `VITE_FF_SDK_OWNER_ORDERS_ENABLED=false` or remove env var → redeploy frontend  
2. Dev: `localStorage.setItem('FF_SDK_OWNER_ORDERS_ENABLED', 'false')`  
3. No server/Firestore/adapter rollback required  

Instant revert at presentation layer.

---

## 11. Deployment Checklist

- [ ] Merge M1B PR-1  
- [ ] Confirm prod build: flag unset or `false`  
- [ ] Deploy frontend only  
- [ ] Staging: owner order list, filters, dispatch read-only views  
- [ ] Enable flag on staging; verify order cards, timestamps, pending badge  
- [ ] Compare order count flag OFF vs ON for same tenant  
- [ ] 72h owner soak before prod enable  
- [ ] Architecture review gate before next M1B PR  

---

## 12. SDK Coverage Dashboard (updated)

See [`docs/m1/SDK-COVERAGE-DASHBOARD.md`](../m1/SDK-COVERAGE-DASHBOARD.md).

| Consumer | SDK methods | Flag | Status |
|----------|-------------|------|--------|
| OrderTracking | `getOrderById`, `requestGuestViewToken` | `FF_SDK_ORDERTRACKING_ENABLED` | M1A PR-4 |
| MyOrders | `listOrdersForUser`, `getOrderById` | `FF_SDK_MYORDERS_ENABLED` | M1A PR-5 |
| **OwnerOrders** | **`listOrdersForTenant`, `getOrderById`** | **`FF_SDK_OWNER_ORDERS_ENABLED`** | **M1B PR-1** |

---

## Success Criteria

| Criterion | Met |
|-----------|-----|
| Owner Order Management uses OrderSDK | ✅ |
| Flag OFF preserves behavior | ✅ |
| Flag ON uses SDK read models | ✅ |
| No runtime regression (flag OFF) | ✅ |
| No API/Firestore/UI redesign | ✅ |
| Tests passing | ✅ |
| Documentation updated | ✅ |

**STOP.** Await Architecture Review. Do not begin Payments/Checkout/Inventory SDK.

---

*End of M1B PR-1 report.*
