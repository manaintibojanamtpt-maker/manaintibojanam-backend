# M1 PR-4 — OrderTracking SDK Migration Report

**Milestone:** M1 Foundation Refactoring — Phase 1  
**PR:** PR-4 — First SDK consumer migration  
**Authority:** ADR-011, BHOS-000, BHOS-TDD-001, FEB-001  
**Date:** 2026-06-26  
**Status:** Complete

---

## Summary

Migrated **read-only** paths in `OrderTracking.tsx` from direct `api.ts` calls to `OrderSDK` behind feature flag `FF_SDK_ORDERTRACKING_ENABLED`. Default is **OFF** — zero production behavior change until explicitly enabled.

Logged-in realtime tracking remains on Firestore `onSnapshot` (unchanged). Write paths (cancel, reviews) unchanged.

---

## 1. Files changed

### Created

| Path | Purpose |
|------|---------|
| `src/lib/sdkFeatureFlags.ts` | `FF_SDK_ORDERTRACKING_ENABLED` reader + dev override helper |
| `src/lib/orderTrackingReads.ts` | Strangler facade: api.ts vs OrderSDK |
| `src/lib/__tests__/orderTrackingReads.test.ts` | PR-4 SDK read parity tests (3) |
| `docs/m1/PR-4-ORDER-TRACKING-MIGRATION-REPORT.md` | This report |

### Modified

| Path | Change |
|------|--------|
| `src/components/OrderTracking.tsx` | Guest fetch, guest refresh, guest token → `orderTrackingReads` |
| `src/sdk/orders/types.ts` | Optional tracking display passthrough fields on `OrderReadModel` |
| `src/sdk/orders/mappers/mapOrderToReadModel.ts` | Passthrough mapping for UI parity |
| `src/sdk/__tests__/mapOrderToReadModel.test.ts` | Passthrough field test (+1) |
| `src/vite-env.d.ts` | `VITE_FF_SDK_ORDERTRACKING_ENABLED` typing |
| `package.json` | Include PR-4 test in `test:sdk` |

### Not modified (by design)

| Path | Reason |
|------|--------|
| `src/sdk/orders/adapters/OrderApiAdapter.ts` | PR scope: adapter unchanged |
| `src/services/api.ts` | Strangler — legacy path preserved |
| `server.ts`, Firestore rules | No backend changes |
| `MyOrders`, `Checkout`, routing | Out of scope |

---

## 2. Migration summary

| Read operation | Before | After (flag OFF) | After (flag ON) |
|----------------|--------|------------------|-----------------|
| Guest load order | `fetchOrderByIdApi` | Same | `OrderSDK.getOrderById` |
| Guest refresh | `fetchOrderByIdApi` | Same | `OrderSDK.getOrderById` |
| Guest phone verify token | `requestGuestViewToken` | Same | `OrderSDK.requestGuestViewToken` |
| Logged-in realtime | Firestore `onSnapshot` | Same | Same |
| Logged-in manual refresh | Firestore `getDoc` | Same | Same |
| Cancel order | Firestore `updateDoc` | Same | Same |
| Submit review | Firestore `addDoc` | Same | Same |

**Delegation chain (flag ON):**

```
OrderTracking.tsx
  → orderTrackingReads.ts
    → createOrderSDK()
      → OrderApiAdapter (unchanged)
        → defaultOrderApiPort → api.ts
```

---

## 3. Feature flag behavior

**Flag:** `FF_SDK_ORDERTRACKING_ENABLED`

| Priority | Source | Values |
|----------|--------|--------|
| 1 | Env | `VITE_FF_SDK_ORDERTRACKING_ENABLED=true\|false` |
| 2 | Local override (dev/preview only) | `localStorage.FF_SDK_ORDERTRACKING_ENABLED` |
| 3 | Default | **false** |

**Enable in dev:**

```javascript
localStorage.setItem('FF_SDK_ORDERTRACKING_ENABLED', 'true');
location.reload();
```

**Disable (rollback):**

```javascript
localStorage.removeItem('FF_SDK_ORDERTRACKING_ENABLED');
// or
localStorage.setItem('FF_SDK_ORDERTRACKING_ENABLED', 'false');
location.reload();
```

**Production:** Set `VITE_FF_SDK_ORDERTRACKING_ENABLED=false` (default) at build time; flip to `true` when ready.

Helper: `setSdkOrderTrackingOverride(enabled)` in `src/lib/sdkFeatureFlags.ts` (dev/preview only).

---

## 4. Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| SDK read model missing UI fields | Medium | Passthrough fields added to mapper/types (PR-4); parity tests |
| Flag accidentally ON in prod | Low | Defaults false; env-gated rollout |
| Guest token error message drift | Low | Adapter maps failures; facade preserves `{ success, error }` shape |
| Logged-in path divergence | Low | Firestore paths untouched; only api.ts reads migrated |
| Performance (extra SDK layer) | Low | Thin facade; same network calls via adapter |

**Residual risk:** Manual QA required for guest flows with flag ON before prod enable.

---

## 5. Rollback plan

1. Set `VITE_FF_SDK_ORDERTRACKING_ENABLED=false` and redeploy frontend, **or**
2. Remove env var (defaults OFF) and redeploy, **or**
3. In dev: `localStorage.setItem('FF_SDK_ORDERTRACKING_ENABLED', 'false')`

No database migration, no server deploy, no adapter rollback required. Instant revert at presentation layer.

---

## 6. Test results

| Suite | Result |
|-------|--------|
| `npm run test:sdk` | **16/16 pass** (+4 vs PR-3: passthrough + PR-4 parity) |
| `npm run test:unit` | **38/38 pass** |
| `npm run test:api-security` | Run with full `test:security` in CI |
| `npm run test:rules` | Run with full `test:security` in CI |
| `npm run test:smoke` | **22/22 pass** |
| `npm run lint:presentation` | **PASS** |

### Scenario validation

| Scenario | Flag OFF | Flag ON | Notes |
|----------|----------|---------|-------|
| Guest tracking | Legacy api.ts | OrderSDK → adapter → api.ts | Same HTTP endpoints |
| Logged-in tracking | Firestore listener | Unchanged | Not api.ts |
| Invalid order ID | null → verify prompt | Same via SDK NOT_FOUND → null | |
| Unauthorized order | API 403/404 | Adapter UNAUTHORIZED/NOT_FOUND | |
| Expired guest token | Cleared on failed fetch | Same | |
| SDK parity | N/A | Unit tests assert read model = mapper(api) | |

### Manual QA checklist (pre-prod enable)

- [ ] Guest order with valid token loads ETA, fees, address
- [ ] Guest phone verify (full phone + last-4)
- [ ] Guest refresh button
- [ ] Expired token prompts re-verify
- [ ] Logged-in user still receives realtime updates
- [ ] Cancel + review still work (writes)

---

## 7. Deployment checklist

- [ ] Merge PR-4 to main
- [ ] Confirm `VITE_FF_SDK_ORDERTRACKING_ENABLED` unset or `false` in prod build
- [ ] Deploy frontend only (no API/Firestore deploy)
- [ ] Smoke test guest tracking on staging with flag OFF
- [ ] Enable flag on staging: `VITE_FF_SDK_ORDERTRACKING_ENABLED=true`
- [ ] Run manual QA checklist on staging
- [ ] Monitor guest 401/404 rates for 24h
- [ ] Gradual prod enable if staging clean

---

## 8. Recommendation

**Approve merge.** PR-4 completes the first strangler consumer with safe defaults:

- Flag **OFF** = identical to pre-PR-4 production
- Flag **ON** = SDK path with parity-tested read model and unchanged network layer
- Rollback is a single env/localStorage flip

**Next (PR-5+, not started):** Additional consumers (e.g. `MyOrders`) only after staging soak with `FF_SDK_ORDERTRACKING_ENABLED=true`.

**Do not migrate:** Checkout, MyOrders (per M1 PR-4 scope).

---

*End of PR-4 report.*
