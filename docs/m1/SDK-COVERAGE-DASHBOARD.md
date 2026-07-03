# BhojanOS SDK Coverage Dashboard

**Milestone:** M1 Foundation Refactoring — Phase 1  
**Authority:** ADR-011, M1 Planning Report  
**Last updated:** 2026-06-26 (PR-6)

---

## Realtime provider status (PR-6)

| Component | Status | Wired to UI |
|-----------|--------|-------------|
| `RealtimeProvider` interface | ✅ PR-6 | No |
| `PollingProvider` | ✅ PR-6 | No |
| `ProviderFactory` | ✅ PR-6 | No |
| Firestore realtime strategy | ⬜ Future | No |
| SSE strategy | ⬜ Future | No |
| WebSocket strategy | ⬜ Future | No |

Presentation still uses legacy paths (`myOrdersReads` inline polling, Firestore subscriptions when flags OFF). PR-7+ may wire `RealtimeProvider` behind feature flags.

---

**Last updated:** 2026-06-26 (M1B PR-1)

---

## Consumer migration status

| Screen / surface | Read operations | OrderSDK methods | Feature flag | PR | Status |
|------------------|-----------------|------------------|--------------|-----|--------|
| **OrderTracking** | Guest order fetch, guest refresh, guest view token | `getOrderById`, `requestGuestViewToken` | `FF_SDK_ORDERTRACKING_ENABLED` | M1A PR-4 | ✅ Migrated (default OFF) |
| **MyOrders** | Logged-in order list, guest order list | `listOrdersForUser`, `getOrderById` | `FF_SDK_MYORDERS_ENABLED` | M1A PR-5 | ✅ Migrated (default OFF) |
| **OwnerOrders** | Tenant order list (live), order detail read | `listOrdersForTenant`, `getOrderById` | `FF_SDK_OWNER_ORDERS_ENABLED` | M1B PR-1 | ✅ Migrated (default OFF) |
| Checkout | — | — | — | — | ⬜ Not approved |
| Owner Dashboard | — | — | — | — | ⬜ Not in scope |
| PaymentSuccess | Guest token ensure | — | — | — | ⬜ Not started |
| OrderSuccess | Guest token ensure | — | — | — | ⬜ Not started |

---

## OrderSDK method coverage

| Method | Adapter impl | Wired to UI | Consumers |
|--------|--------------|-------------|-----------|
| `getOrderById` | ✅ OrderApiAdapter | ✅ | OrderTracking (guest), MyOrders (guest), OwnerOrders (detail) |
| `listOrdersForUser` | ✅ OrderApiAdapter | ✅ | MyOrders (logged-in) |
| `listOrdersForTenant` | ✅ OrderApiAdapter | ✅ | OwnerOrders (tenant list) |
| `requestGuestViewToken` | ✅ OrderApiAdapter | ✅ | OrderTracking (guest verify) |

---

## Feature flags (presentation layer)

| Flag | Default | Env var | Scope |
|------|---------|---------|-------|
| `FF_SDK_ORDERTRACKING_ENABLED` | `false` | `VITE_FF_SDK_ORDERTRACKING_ENABLED` | OrderTracking guest reads |
| `FF_SDK_MYORDERS_ENABLED` | `false` | `VITE_FF_SDK_MYORDERS_ENABLED` | MyOrders list reads |
| `FF_SDK_OWNER_ORDERS_ENABLED` | `false` | `VITE_FF_SDK_OWNER_ORDERS_ENABLED` | OwnerOrders tenant list reads |

---

## Write operations (unchanged — not in SDK M1 scope)

| Operation | Location | Path |
|-----------|----------|------|
| Cancel order | MyOrders, OrderTracking | `api.updateOrderStatus` / Firestore |
| Submit rating | MyOrders, OrderTracking | Firestore `reviews` + `orders` |
| Reorder menu fetch | MyOrders | `fetchMenu` (menu, not order SDK) |

---

## Rollout recommendation

1. Enable customer flags on staging → soak → prod  
2. Enable `FF_SDK_OWNER_ORDERS_ENABLED` on staging → soak → prod  
3. Do **not** enable Checkout until Architecture Review approves  

---

*Updated after M1B PR-1.*
