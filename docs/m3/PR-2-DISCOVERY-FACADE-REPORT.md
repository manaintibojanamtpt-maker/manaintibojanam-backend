# M3 PR-2 — DiscoveryFacade + Presentation Integration Report

**PR:** BHOS-M3-PR2  
**Date:** 2026-06-26  
**Version:** `DISCOVERY_SDK_VERSION = 0.1.0-foundation` (stub adapter added)  
**Status:** ✅ Complete — facade wired, zero production impact (flag OFF)

---

## 1. Files Created

| Path | Purpose |
|------|---------|
| `src/lib/discovery/DiscoveryFacade.ts` | Presentation facade — only entry for UI |
| `src/lib/discovery/DiscoveryContext.ts` | Builds `DiscoveryQuery` from customer session |
| `src/lib/discovery/DiscoverySession.ts` | Loading / retry / result session pub-sub |
| `src/lib/discovery/discoveryFeatureFlags.ts` | Presentation flag reader |
| `src/lib/discovery/types.ts` | Facade query, outcome, session types |
| `src/sdk/discovery/adapters/StubDiscoveryAdapter.ts` | NOT_CONFIGURED SDK stub |
| `src/sdk/discovery/adapters/notConfigured.ts` | SdkError helpers |
| `src/sdk/discovery/createDiscoverySDK.ts` | Factory (stub only) |
| `src/lib/__tests__/discoveryFacade.test.ts` | Facade + stub tests |

**Not created:** Repository, ranking engine, Firestore adapter, UI pages, checkout changes.

---

## 2. Architecture Validation

| Rule | Status |
|------|--------|
| Presentation uses `DiscoveryFacade` only | ✅ No UI wired yet; facade ready |
| Facade does not call Firestore | ✅ |
| Facade does not call LocationSDK | ✅ Reads customer session only |
| Facade does not know repositories | ✅ Delegates to `DiscoverySDK` |
| No ranking implementation | ✅ Stub returns NOT_CONFIGURED |
| No geohash queries | ✅ Geohash passed through from session only |
| Feature flags default OFF | ✅ |
| OrderSDK frozen | ✅ Unchanged |

---

## 3. Facade Diagram

```
Presentation (future DiscoverPage)
        │
        ▼
DiscoveryFacade.discoverNearbyKitchens()
        │
        ├─ isDiscoveryEnabled()? ──NO──► disabled outcome
        │
        ├─ readCustomerLocationSession()
        │
        ├─ buildDiscoveryQuery()  (DiscoveryContext)
        │
        ├─ DiscoverySDK.discoverNearby()  (stub → NOT_CONFIGURED)
        │
        ├─ normalizeDiscoveryError()
        │
        └─ DiscoverySession (loading / success / error / retry)
```

---

## 4. Feature Flags

| Flag | Reader | Default | Facade behaviour |
|------|--------|---------|------------------|
| `FF_DISCOVERY_ENABLED` | `isDiscoveryEnabled()` | OFF | Skip SDK; return disabled |
| `FF_DISCOVERY_RANKING_ENABLED` | `isDiscoveryRankingEnabled()` | OFF | `sortBy: distance` vs `recommended` |
| `FF_DISCOVERY_MARKETPLACE_ENABLED` | `isDiscoveryMarketplaceEnabled()` | OFF | Reserved for PR-8 UI |

Env keys: `VITE_FF_DISCOVERY_*` (see `.env.example`)

---

## 5. Testing

```bash
npm run test:sdk   # 127/127 pass (+9 PR-2)
```

| Test | Coverage |
|------|----------|
| Flag OFF → disabled outcome | ✅ |
| Customer location required | ✅ |
| Query mapping from session | ✅ |
| SDK success → session success | ✅ |
| NOT_CONFIGURED normalization | ✅ |
| Retry count on failure | ✅ |
| StubDiscoveryAdapter | ✅ |

No Firestore, no browser APIs, no network.

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| UI imports DiscoverySDK directly | Facade documented; no UI in this PR |
| Flag accidentally ON in prod | Default OFF; disabled path safe |
| Customer location missing | Validation error with user message |
| Retry storms | Max 3 retries in `retryDiscovery()` |
| Dual location stores | Facade reads customer session; delivery state unchanged |

---

## 7. Rollback Plan

1. Set `FF_DISCOVERY_ENABLED=false` (default) — no behaviour change.
2. Delete `src/lib/discovery/` and SDK stub adapter files.
3. Remove test file from `test:sdk` script.

No Firestore, checkout, or payment changes to revert.

---

## 8. Definition of Done

| Criterion | Status |
|-----------|--------|
| `DiscoveryFacade` implemented | ✅ |
| `DiscoverySession` loading/retry | ✅ |
| `DiscoveryContext` query builder | ✅ |
| Presentation feature flags | ✅ |
| Reads `CustomerCanonicalLocation` | ✅ |
| Invokes stub `DiscoverySDK` | ✅ |
| Normalizes SDK errors | ✅ |
| No UI redesign | ✅ |
| No repository / ranking / Firestore | ✅ |
| Tests pass | ✅ |
| STOP — await approval | ✅ |

---

**Next approved milestone:** M3-PR-3 — Tenant-as-branch `DiscoveryRepository` adapter.
