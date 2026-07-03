# M3 PR-8 — Marketplace Home Experience Report

**PR:** BHOS-M3-PR8  
**Date:** 2026-06-26  
**Version:** Presentation layer only (no SDK version bump)  
**Status:** ✅ Complete — marketplace home behind `FF_DISCOVERY_MARKETPLACE_ENABLED`, discovery platform consumed as-is

---

## 1. Repository Analysis

| Layer | Location | Role in PR-8 |
|-------|----------|--------------|
| Root routing | `src/App.tsx` → `StorefrontRootRoute` | BhojanOS root `/` switches marketplace vs marketing landing |
| Discovery facade | `src/lib/discovery/DiscoveryFacade.ts` | Sole discovery entry for marketplace |
| Discovery session | `src/lib/discovery/DiscoverySession.ts` | Loading / success / error pub-sub |
| Customer location | `src/lib/customerLocation/CustomerLocationFacade.ts` | GPS + manual geocode → `CustomerCanonicalLocation` |
| Feature flags | `src/lib/discovery/discoveryFeatureFlags.ts` | `isDiscoveryMarketplaceEnabled()` |
| SDK pipeline | `src/sdk/discovery/**` | **Unchanged** — consumed via facade |

**New presentation modules:**

| File | Purpose |
|------|---------|
| `src/lib/marketplace/MarketplaceHomeFacade.ts` | Orchestrates location + discovery; badge mapping |
| `src/lib/marketplace/mapDiscoveryToMarketplace.ts` | `DiscoveryResult` → view models |
| `src/lib/marketplace/types.ts` | Presentation DTOs |
| `src/hooks/useMarketplaceHome.ts` | Session subscription hook |
| `src/pages/MarketplaceHome.tsx` | Page shell |
| `src/components/marketplace/*` | Cards + state panels |

**Not modified:** Repository, Eligibility, Ranking, Pipeline, SDK contracts, GeoIndex, Firestore schema, checkout, payments, owner dashboard.

---

## 2. UI Flow

```
User lands on BhojanOS root (/)
        ↓
FF_DISCOVERY_MARKETPLACE_ENABLED?
   OFF → OnboardKitchen (existing marketing landing)
   ON  → MarketplaceHome
        ↓
CustomerCanonicalLocation in session?
   NO  → Location panel (GPS detect + manual address)
   YES → MarketplaceHomeFacade.loadMarketplaceHome()
        ↓
DiscoveryFacade.discoverNearbyKitchens()
        ↓
DiscoverySession updates (loading → success | error | empty)
        ↓
Presentation renders MarketplaceKitchenCard list
        ↓
User taps card → /k/{slug} (existing tenant storefront)
```

No checkout, ordering, search, or AI in this PR.

---

## 3. Marketplace Architecture

```
Presentation (React)
        ↓
useMarketplaceHome
        ↓
MarketplaceHomeFacade
        ↓
DiscoveryFacade
        ↓
DiscoverySDK
        ↓
Discovery Pipeline
        ↓
DiscoveryResult[]
        ↓
mapDiscoveryToMarketplace → MarketplaceKitchenCard[]
```

**Rules enforced:**

- No Firestore access from presentation
- No discovery business logic in React components
- Badge derivation lives in `mapDiscoveryToMarketplace.ts`
- Location uses `CustomerCanonicalLocation` only

---

## 4. Discovery Integration

| Concern | Implementation |
|---------|----------------|
| Query build | `DiscoveryFacade` → `buildDiscoveryQuery` from session location |
| Default radius | 10 km, limit 24 |
| Results | `DiscoveryResult.restaurants` (`NearbyRestaurant[]`) |
| Fields shown | distance, ETA, eligibility, rating, open status, ranking badges |
| Retry | `retryMarketplaceHome` → `retryDiscovery` (session last query) |
| Duplicate queries | Hook loads only when session `idle` + location present |

**Required flags for full marketplace in dev/staging:**

| Flag | Purpose |
|------|---------|
| `VITE_FF_DISCOVERY_ENABLED` | Master discovery gate |
| `VITE_FF_DISCOVERY_MARKETPLACE_ENABLED` | Marketplace home route |
| `VITE_FF_DISCOVERY_TENANT_REPOSITORY_ENABLED` | Live tenant data |
| `VITE_FF_DISCOVERY_ELIGIBILITY_ENABLED` | Distance / radius eligibility |
| `VITE_FF_DISCOVERY_RANKING_ENABLED` | Optional weighted ranking |
| `VITE_FF_DISCOVERY_GEOINDEX_ENABLED` | Optional geoIndex path |

---

## 5. Session Management

| Session | Storage | Usage |
|---------|---------|-------|
| `CustomerCanonicalLocation` | `sessionStorage` via `readCustomerLocationSession` | Discovery query anchor |
| `DiscoverySession` | In-memory pub/sub | Loading, result, error, retry count |

`useMarketplaceHome`:

1. Subscribes to `subscribeDiscoverySession` for reactive UI
2. Auto-invokes `loadMarketplaceHome` once when location exists and discovery session is `idle`
3. `detectLocation` / `setManualLocation` write canonical location then load
4. `retry` delegates to `retryMarketplaceHome` (no new query shape)

---

## 6. Loading / Error States

| Status | UI |
|--------|-----|
| `loading` | Spinner — "Finding nearby kitchens…" |
| `location_required` | GPS + manual address form |
| `location_denied` | Permission denied copy + manual fallback |
| `location_unavailable` | Detection failure + retry |
| `empty` | No kitchens in radius + retry |
| `error` | Facade error message + retry when `retryable` |
| `disabled` | Marketplace or discovery flags off |
| `success` | Kitchen card grid |

**Explainable badges** (facade-derived):

| Badge | Rule |
|-------|------|
| Closest | Index 0 in ranked list |
| Within Delivery Radius | `eligibility.isServiceable` |
| Fast Delivery | `eta.totalMins ≤ 35` |
| Highly Rated | `rating ≥ 4.5` or rating signal ≥ 0.8 |

---

## 7. Feature Flag Behaviour

| `FF_DISCOVERY_MARKETPLACE_ENABLED` | Root `/` behaviour |
|------------------------------------|--------------------|
| **OFF** (default) | `OnboardKitchen` marketing landing |
| **ON** | `MarketplaceHome` discovery-powered home |

Tenant routes (`/k/:slug`, legacy storefront paths) are **unchanged**.

Graceful fallback: marketplace ON + discovery OFF → disabled state with user message (no crash).

Instant rollback: set `VITE_FF_DISCOVERY_MARKETPLACE_ENABLED=false` → previous landing restored.

---

## 8. Testing

**Automated** (`src/lib/__tests__/marketplaceHomeFacade.test.ts`):

| Case | Covered |
|------|---------|
| Marketplace flag OFF | ✅ |
| Location required | ✅ |
| Discovery master flag OFF | ✅ |
| Successful load + card mapping | ✅ |
| Empty results | ✅ |
| Retry reuses session query | ✅ |
| Badge derivation | ✅ |
| Eligibility labels | ✅ |

**Manual QA checklist:**

| Scenario | Expected |
|----------|----------|
| Location available | Kitchen list with distance / ETA / badges |
| Location denied | Denied panel + manual entry |
| Empty results | Empty state + retry |
| Many results | Grid scroll, stable sort from pipeline |
| Slow pipeline | Loading spinner until session success |
| Retry | Re-runs last query via facade |
| Flag OFF | Marketing landing at `/` |
| Flag ON | Marketplace home at `/` |

Run: `npm run test:sdk`

---

## 9. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Flags misconfigured in prod | Medium | All flags default OFF; marketplace isolated from tenant storefront |
| Geocoding failure on manual entry | Medium | Validation errors surfaced; user can retry |
| Stale discovery session on location change | Low | New location write triggers fresh load |
| Performance with many tenants | Low | Pipeline limit + existing geoIndex flag path |
| User expects ordering on marketplace home | Medium | Cards link to tenant storefront only — no checkout in PR-8 |

---

## 10. Rollback Plan

1. Set `VITE_FF_DISCOVERY_MARKETPLACE_ENABLED=false` in environment
2. Redeploy hosting (no code revert required)
3. Root `/` immediately serves `OnboardKitchen` again
4. Discovery pipeline / SDK unaffected

Code rollback (if needed): revert `StorefrontRootRoute` branch and marketplace files only.

---

## 11. Definition of Done

- [x] `MarketplaceHomeFacade` orchestrates location + discovery without SDK/pipeline changes
- [x] Presentation renders `DiscoveryResult` via view models only
- [x] `DiscoverySession` drives loading / success / error UI
- [x] `CustomerCanonicalLocation` only for location
- [x] States: loading, empty, permission denied, unavailable, retry, manual location
- [x] Explainable badges: Closest, Fast Delivery, Highly Rated, Within Delivery Radius
- [x] `FF_DISCOVERY_MARKETPLACE_ENABLED` gates root route (default OFF)
- [x] No checkout, ordering, search, or AI
- [x] Unit tests added and wired into `test:sdk`
- [x] No repository, eligibility, ranking, pipeline, geoIndex, or Firestore schema changes

**Awaiting Architecture Review Board approval** before enabling flags in production.

---

## File Summary

```
src/lib/marketplace/
  MarketplaceHomeFacade.ts
  mapDiscoveryToMarketplace.ts
  types.ts
src/hooks/useMarketplaceHome.ts
src/pages/MarketplaceHome.tsx
src/components/marketplace/
  MarketplaceKitchenCard.tsx
  MarketplaceHomeStates.tsx
src/lib/__tests__/marketplaceHomeFacade.test.ts
src/App.tsx                          (StorefrontRootRoute flag branch)
package.json                         (test:sdk entry)
```
