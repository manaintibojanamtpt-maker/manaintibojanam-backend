# M4 Phase 1 — Repository Audit (Search Intelligence)

**Date:** 2026-06-26  
**Scope:** Read-only audit — no code changes  
**Parent:** [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)

---

## Executive Summary

BhojanOS has a **frozen Discovery pipeline** and a **ready Marketplace home** (M3 PR-8) that lists nearby kitchens via `DiscoveryFacade`. **No Search platform exists.** Search-related methods on `DiscoverySDK` are contract stubs returning `NOT_CONFIGURED`. Single-tenant menu search is client-side only. Cross-tenant restaurant, cuisine, food, area, and tag search are **greenfield** work for M4.

---

## 1. Marketplace Platform

### Files

| Path | Role |
|------|------|
| `src/lib/marketplace/MarketplaceHomeFacade.ts` | Location + `discoverNearbyKitchens` orchestration |
| `src/lib/marketplace/mapDiscoveryToMarketplace.ts` | `DiscoveryResult` → cards + badges |
| `src/lib/marketplace/types.ts` | `MarketplaceKitchenCard`, `MarketplaceHomeViewModel` |
| `src/hooks/useMarketplaceHome.ts` | `DiscoverySession` subscription |
| `src/pages/MarketplaceHome.tsx` | Page layout |
| `src/components/marketplace/MarketplaceKitchenCard.tsx` | Result card |
| `src/components/marketplace/MarketplaceHomeStates.tsx` | Loading / location / empty / error |

### Data shown today

- Restaurant name, slug, distance, ETA, rating, eligibility, open status
- Explainable badges: Closest, Fast Delivery, Highly Rated, Within Delivery Radius
- **Not shown:** cuisine tags, food items, area, search highlights

### Search relevance

Marketplace is the primary consumer for M4 search UI. Pattern to replicate: facade → session → hook → page. Search bar will call `SearchFacade`, not extend `MarketplaceHomeFacade` with discovery logic.

---

## 2. DiscoveryResult

**Source:** `src/sdk/discovery/dto/results.ts`

Pipeline output after ranking. Consumed by:

- `DiscoveryFacade.discoverNearbyKitchens`
- `MarketplaceHomeFacade.loadMarketplaceHome`
- Future `SearchSDK` (intersection stage)

### NearbyRestaurant fields

```
tenantId, branchId, name, slug, point, distanceKm, geohash,
eligibility, eta?, rating?, isOpen, thumbnailUrl?, ranking?
```

### DiscoveryCandidate fields (pre-pipeline)

Additional fields available before mapping to `NearbyRestaurant`:

```
cuisineTags?, prepTimeMins?, maxRadiusKm?, isLive?, status?
```

**Audit finding:** `cuisineTags` exist on candidates but are **dropped** at `DiscoveryMapper` → search UI cannot show cuisine without `SearchRestaurantHit` wrapper or ADR to extend `NearbyRestaurant`.

---

## 3. Discovery SDK & Facade

### DiscoverySDK (`src/sdk/discovery/contracts/DiscoverySDK.ts`)

| Method | Implementation status |
|--------|----------------------|
| `discoverNearby` | ✅ Pipeline |
| `getDiscoveryCandidates` | ✅ Repository |
| `calculateEligibility`, `calculateDistance`, `rankCandidates` | ✅ Flag-gated |
| `findNearbyBranches`, `findNearbyRestaurants` | `NOT_CONFIGURED` |
| `searchByCuisine`, `searchByName` | `NOT_CONFIGURED` |

### DiscoveryFacade (`src/lib/discovery/DiscoveryFacade.ts`)

- `discoverNearbyKitchens(query: DiscoveryFacadeQuery)`
- `DiscoveryFacadeQuery` includes `searchText?`, `cuisineTags?`, `areaCode?` — forwarded to `DiscoveryQuery` but **not used** by repository or as hard filters

### Frozen contract constraint

From `DISCOVERY-PIPELINE-CONTRACT.md`:

> Repository may NOT: Rank, filter eligibility, **search**

Therefore M4 Search **must not** implement search inside `DiscoveryRepository`. New `SearchRepository` is required.

---

## 4. Tenant Search

| Location | Behaviour |
|----------|-----------|
| `DiscoveryRepository.searchByName` | Stub |
| `DiscoveryRepository.searchByCuisine` | Stub |
| `TenantsCrmPanel.tsx` | Admin client filter on name/slug |
| `DiscoveryQuery.searchText` | Passed through, ignored |

### Tenant metadata (discovery read)

`FirestoreTenantRepositoryAdapter` maps:

- `name`, `slug`, `status`, `storeStatus`
- `location.lat/lng/geohash`
- `deliveryConfig.maxRadius`, `prepTime`
- `storeOperations.isStoreOpen`
- `branding.logoUrl`
- `cuisineTags[]`
- `ratingAggregate`

---

## 5. Menu Search

| Location | Behaviour |
|----------|-----------|
| `src/pages/Menu.tsx` | `useMemo` filter on name, category, description |
| URL `?search=` | Read from query string, applied client-side |
| `StorefrontDesktopHeader.tsx` | Links to `/menu?search=` |
| `AiOrderingWidget.tsx` | In-widget menu filter |

### MenuItem model (`src/types.ts`)

Fields usable for food search: `name`, `description`, `category`, `type` (veg/non-veg), `rating`, `isPopular`, `isBestSeller`.

### Firestore

- Collection: `menu` — filtered by `tenantId`
- Collection: `categories` — per-tenant

**No global menu index.** Cross-tenant food search requires `MenuSearchPort` + batch reads or denormalized index (M4 PR-5+).

---

## 6. Cuisine Data

| Layer | Cuisine support |
|-------|-----------------|
| Firestore `tenants.cuisineTags` | ✅ Array of strings |
| `DiscoveryCandidate.cuisineTags` | ✅ Mapped |
| `DiscoveryQuery.cuisineTags` | ✅ Ranking signal `cuisineMatch` only |
| `NearbyRestaurant` | ❌ Not present |
| `MarketplaceKitchenCard.cuisineTags` | ❌ Always `undefined` in mapper |
| `SearchFilter.cuisineTags` | DTO only, unused |

### Ranking signal

`src/domain/discovery/ranking/RankingSignals.ts` — `normalizeCuisineMatchSignal(candidate.cuisineTags, query.cuisineTags)` — overlap ratio, not filter.

---

## 7. Tags

| Tag type | Exists? |
|----------|---------|
| Cuisine tags | `tenants.cuisineTags` |
| General restaurant tags | ❌ No schema |
| Menu tags | ❌ No dedicated field (category only) |
| User-facing facet tags | ❌ Not modeled |

M4 `TagFilter` should start with `cuisineTags` + future extensibility.

---

## 8. Restaurant Metadata Gap Matrix

| Field | Firestore | Discovery read | NearbyRestaurant | Search need |
|-------|-----------|----------------|------------------|-------------|
| name | ✅ | ✅ | ✅ | Name search |
| slug | ✅ | ✅ | ✅ | Deep link |
| cuisineTags | ✅ | ✅ | ❌ | Cuisine filter |
| ratingAggregate | ✅ | partial | ✅ rating | Rating facet |
| areaCode | ✅ (full tenant) | ❌ | ❌ | Area search |
| pincode | ✅ | ❌ | ❌ | Pincode search |
| description | ✅ | ❌ | ❌ | Contains search |
| isStoreOpen | ✅ | ✅ | ✅ isOpen | Open Now |
| prepTime | ✅ | ✅ candidate | via eta | Delivery time |
| logo | ✅ | ✅ | ✅ thumbnail | Display |

---

## 9. Feature Flag Patterns (reference for M4)

| Module | SDK file | Presentation file |
|--------|----------|-------------------|
| Discovery | `src/sdk/discovery/core/featureFlags.ts` | `src/lib/discovery/discoveryFeatureFlags.ts` |
| Location | `src/sdk/location/core/featureFlags.ts` | `src/lib/locationFeatureFlags.ts` |
| Order | — | `src/lib/sdkFeatureFlags.ts` |

All flags: `VITE_FF_*` env, default `false`, dev localStorage override.

---

## 10. SDK Structure Reference

```
src/sdk/{module}/
  contracts/     # Public interface
  dto/           # Types + barrel
  adapters/      # Default + Stub + notConfigured
  create*.ts     # Factory
  version.ts     # VERSION, FROZEN, MODULE
  core/featureFlags.ts
  repository/ or providers/
  README.md
  __tests__/
```

Discovery adds: `eligibility/`, `ranking/`, `pipeline/`, `filters/` (types only).

Search should add: `pipeline/`, `filters/`, `ranking/` (search-specific, not discovery).

---

## 11. Recommendations for M4 PR-1

1. Create `src/sdk/search/` scaffold per master architecture doc — contracts only.
2. Do **not** implement `DiscoveryRepository.searchBy*`.
3. Introduce `SearchRestaurantHit` wrapper to avoid frozen DTO mutation initially.
4. Plan `MenuSearchPort` for food search without presentation Firestore access.
5. Wire marketplace search UI only after `SearchPipeline` (PR-6+) is tested.
6. File ADR before adding `cuisineTags` to `NearbyRestaurant`.

---

*Phase 1 complete — no code changes.*
