# M1 PR-3 — OrderSDK Adapter Layer Report

**Milestone:** M1 Foundation Refactoring — Phase 1  
**PR:** PR-3 — OrderSDK read adapter  
**Authority:** ADR-011, BHOS-000  
**Date:** 2026-06-30  
**Status:** Complete

---

## Summary

Implemented read-only `OrderApiAdapter` that wraps `src/services/api.ts` via injectable `OrderApiPort`. No UI wiring, no `api.ts` changes, no runtime behavior change for customers.

---

## Files created

| Path | Purpose |
|------|---------|
| `src/sdk/core/resultHelpers.ts` | `sdkOk` / `sdkFail` helpers |
| `src/sdk/orders/mappers/mapOrderToReadModel.ts` | Pure api → read-model mapper |
| `src/sdk/orders/adapters/OrderApiPort.ts` | Delegation port interface |
| `src/sdk/orders/adapters/OrderApiAdapter.ts` | Read-only OrderSDK impl |
| `src/sdk/orders/adapters/defaultOrderApiPort.ts` | Binds to `api.ts` |
| `src/sdk/orders/createOrderSDK.ts` | Factory |
| `src/sdk/orders/adapters/README.md` | Adapter documentation |
| `src/sdk/__tests__/mapOrderToReadModel.test.ts` | Mapper unit tests (5) |
| `src/sdk/__tests__/orderApiAdapter.test.ts` | Adapter + parity tests (7) |

## Files modified

| Path | Change |
|------|--------|
| `src/sdk/index.ts` | Export adapter, factory, mapper |
| `src/sdk/README.md` | PR-3 status |
| `package.json` | `test:sdk`; included in `test:security` |

## Files not modified (by design)

- `src/services/api.ts`
- All React pages/components
- `server.ts`, Firestore rules

---

## Delegation map

| OrderSDK | api.ts |
|----------|--------|
| `getOrderById` | `fetchOrderByIdApi` |
| `listOrdersForUser` | `fetchOrders` (+ tenant/limit in adapter) |
| `requestGuestViewToken` | `requestGuestViewToken` |

---

## Tests

| Suite | Result |
|-------|--------|
| `npm run test:sdk` | ✅ 12/12 (incl. 2 parity tests) |
| `npm run test:security` | ✅ 63 total (unit + sdk + api + rules compile) |
| `npm run test:smoke` | ✅ 22/22 |
| `npm run lint:presentation` | ✅ Pass |

---

## Risk assessment

| Risk | Level |
|------|-------|
| Production regression | **None** — SDK not imported by app |
| api.ts behavior drift | **Low** — parity tests lock mapper to api records |
| Bundle size | **None** — unused until PR-4 |

---

## Rollback

```bash
git revert <PR-3-commit-sha>
```

---

## Next step

**M1 PR-4 — Migrate OrderTracking behind `FF_SDK_ORDER_READ`** (not started).

---

*M1 PR-3 — BhojanOS Engineering*
