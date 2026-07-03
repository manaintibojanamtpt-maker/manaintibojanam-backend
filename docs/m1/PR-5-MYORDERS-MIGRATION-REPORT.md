# M1 PR-5 — MyOrders SDK Migration Report

**Milestone:** M1 Foundation Refactoring — Phase 1  
**PR:** PR-5 — MyOrders SDK consumer migration  
**Authority:** ADR-011, BHOS-000, FEB-001, M1 PR-4 Approved  
**Date:** 2026-06-26  
**Status:** Complete

---

## 1. Migration Summary

Migrated **all read operations** in `MyOrders.tsx` behind feature flag `FF_SDK_MYORDERS_ENABLED`. Default is **OFF** — production behavior unchanged until explicitly enabled.

| Read path | Before | Flag OFF | Flag ON |
|-----------|--------|----------|---------|
| Logged-in order list | Firestore `subscribeToOrders` | Same | `OrderSDK.listOrdersForUser` (30s poll) |
| Guest order list | Firestore `subscribeToGuestOrders` | Same | `OrderSDK.getOrderById` per stored ID (30s poll) |
| Reorder menu load | `fetchMenu` | Same | Same (menu read, out of scope) |
| Cancel order | `apiUpdateOrderStatus` | Same | Same |
| Rating submit | Firestore writes | Same | Same |

**Not migrated:** Checkout, Owner Dashboard, PaymentSuccess, OrderSuccess (per STOP scope).

---

## 2. Files Changed

### Created

| Path | Purpose |
|------|---------|
| `src/lib/myOrdersReads.ts` | Strangler facade: Firestore subscriptions vs OrderSDK |
| `src/lib/orderReadModelMapper.ts` | Pure OrderReadModel → Order mapper (shared) |
| `src/lib/__tests__/myOrdersReads.test.ts` | PR-5 parity tests (4) |
| `docs/m1/PR-5-MYORDERS-MIGRATION-REPORT.md` | This report |
| `docs/m1/SDK-COVERAGE-DASHBOARD.md` | Updated SDK consumer dashboard |

### Modified

| Path | Change |
|------|--------|
| `src/pages/MyOrders.tsx` | `subscribeMyOrders` replaces direct subscription imports |
| `src/lib/sdkFeatureFlags.ts` | Added `FF_SDK_MYORDERS_ENABLED` |
| `src/sdk/orders/types.ts` | MyOrders passthrough fields (`rating`, `feedback`, etc.) |
| `src/sdk/orders/mappers/mapOrderToReadModel.ts` | Passthrough mapping |
| `src/vite-env.d.ts` | `VITE_FF_SDK_MYORDERS_ENABLED` typing |
| `package.json` | PR-5 test in `test:sdk` |

### Not modified (by design)

- `OrderApiAdapter.ts`, `api.ts`, `server.ts`, Firestore rules  
- Checkout, Owner Dashboard, routing, UI markup  

---

## 3. Feature Flag

**Flag:** `FF_SDK_MYORDERS_ENABLED`

| Priority | Source |
|----------|--------|
| 1 | `VITE_FF_SDK_MYORDERS_ENABLED=true\|false` |
| 2 | `localStorage.FF_SDK_MYORDERS_ENABLED` (dev/preview only) |
| 3 | Default: **false** |

**Enable in dev:**

```javascript
localStorage.setItem('FF_SDK_MYORDERS_ENABLED', 'true');
location.reload();
```

**Rollback:** Set flag to `false` or remove override — instant revert to Firestore subscriptions.

Helper: `setSdkMyOrdersOverride(enabled)` in `src/lib/sdkFeatureFlags.ts`.

---

## 4. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Realtime → polling latency (flag ON) | Medium | 30s poll matches OrderTracking guest pattern; flag OFF keeps onSnapshot |
| Read-model field loss | Medium | Extended passthrough fields + `readModelToOrder` mapper |
| Auto-expire side effect skipped (flag ON) | Low | Expire writes in `subscribeToOrders` are write side-effects; unchanged when flag OFF |
| Guest batch limit (10 IDs) | Low | Preserved from legacy `subscribeToGuestOrders` |
| Multi-tenant filtering | Low | Legacy did not filter by tenant; SDK path matches (all user orders) |

---

## 5. Rollback Plan

1. Set `VITE_FF_SDK_MYORDERS_ENABLED=false` and redeploy frontend, or  
2. Remove env var (defaults OFF), or  
3. Dev: `localStorage.setItem('FF_SDK_MYORDERS_ENABLED', 'false')`

No server, Firestore, or adapter changes required.

---

## 6. Test Results

| Suite | Result |
|-------|--------|
| `npm run test:sdk` | **20/20 pass** (+4 PR-5) |
| `npm run test:unit` | **38/38 pass** |
| `npm run test:api-security` | **13/13 pass** |
| `npm run test:smoke` | **22/22 pass** |
| `npm run lint:presentation` | **PASS** |

### Scenario validation

| Scenario | Flag OFF | Flag ON |
|----------|----------|---------|
| Logged-in customer orders | Firestore realtime | SDK list + poll |
| Empty state (no guest IDs) | Empty array | Empty array |
| Multiple tenants | All user orders shown | Same (no tenant filter) |
| Pagination | N/A (full list) | N/A (full list) |
| Unauthorized user | Firestore rules / empty | SDK → empty on failure |
| SDK parity | N/A | Unit tests assert list/get = mapper(api) |

---

## 7. Deployment Checklist

- [ ] Merge PR-5 to main
- [ ] Confirm prod build: `VITE_FF_SDK_MYORDERS_ENABLED` unset or `false`
- [ ] Deploy frontend only
- [ ] Staging QA: logged-in list, guest list, empty state, reorder, cancel, rate
- [ ] Enable flag on staging; verify 30s refresh updates order status
- [ ] Compare order counts flag OFF vs ON for same user
- [ ] 24h soak before prod enable

---

## 8. SDK Coverage Dashboard (updated)

See [`docs/m1/SDK-COVERAGE-DASHBOARD.md`](./SDK-COVERAGE-DASHBOARD.md).

**Summary:**

| Consumer | Status |
|----------|--------|
| OrderTracking | ✅ PR-4 |
| MyOrders | ✅ PR-5 |
| Checkout | ⬜ Not started |
| Owner Dashboard | ⬜ Not started |

---

## Recommendation

**Approve merge.** PR-5 completes the second strangler consumer with safe defaults. Enable `FF_SDK_MYORDERS_ENABLED` on staging after PR-4 soak; keep prod flags OFF until both screens pass manual QA.

**STOP:** Checkout, Owner Dashboard, and PR-6 not started.

---

*End of PR-5 report.*
