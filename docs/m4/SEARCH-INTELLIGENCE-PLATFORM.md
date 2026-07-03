# M4 — Search Intelligence Platform

**PR:** BHOS-M4 (Architecture)  
**Date:** 2026-06-26  
**Status:** ✅ Architecture complete — **no implementation**  
**Governance:** BHOS-000 · BHOS-TDD-001 · BHOS-PAF-001 · FEB-001 · ADR-011 · ADR-013 · ADR-014 · [Discovery Pipeline Contract](../m3/DISCOVERY-PIPELINE-CONTRACT.md)

**Frozen platforms:** Order · Reference · Location · Discovery · Marketplace (ready)  
**New platform:** Search Intelligence — consumes Discovery, does **not** replace it

---

> **STOP.** No code in this milestone. Await Architecture Review Board approval before **M4 PR-1**.

---

## 1. Repository Audit

### 1.1 Marketplace (M3 PR-8 — ready)

| Asset | Path | Relevance to search |
|-------|------|---------------------|
| Marketplace facade | `src/lib/marketplace/MarketplaceHomeFacade.ts` | Pattern for `SearchFacade` — location + SDK orchestration |
| View models | `src/lib/marketplace/types.ts` | `MarketplaceKitchenCard` has `cuisineTags?` but mapper sets `undefined` |
| Discovery mapping | `src/lib/marketplace/mapDiscoveryToMarketplace.ts` | Badge/ranking explainability pattern for `SearchExplanation` |
| Hook | `src/hooks/useMarketplaceHome.ts` | Session-driven UI; search hook will mirror this |
| Page | `src/pages/MarketplaceHome.tsx` | **No search bar** — only address geocode in `MarketplaceHomeStates` |
| Routing | `src/App.tsx` `StorefrontRootRoute` | Flag-gated marketplace home at BhojanOS root |

**Gap:** Marketplace is discovery-only (radius sort). No text, cuisine, food, area, or facet filters in UI.

### 1.2 DiscoveryResult & pipeline (frozen)

**Contract:** [`docs/m3/DISCOVERY-PIPELINE-CONTRACT.md`](../m3/DISCOVERY-PIPELINE-CONTRACT.md)

```
Repository → DiscoveryCandidate[]
  → EligibilityEngine → EligibleCandidate[]
  → RankingEngine → RankedCandidate[]
  → DiscoveryMapper → DiscoveryResult
  → DiscoveryFacade → Presentation
```

**`DiscoveryResult`** (`src/sdk/discovery/dto/results.ts`):

| Field | Type | Notes |
|-------|------|-------|
| `restaurants` | `NearbyRestaurant[]` | Final ranked list |
| `totalCandidates` | `number` | Pre-limit count |
| `queryRadiusKm` | `number` | Query context |
| `customerGeohash` | `string?` | Geo anchor |
| `rankedAt` | `number` | Timestamp |
| `telemetry` | `DiscoveryPipelineTelemetry?` | Stage timing |

**`NearbyRestaurant`** (output card):

| Present | Missing (vs `DiscoveryCandidate`) |
|---------|----------------------------------|
| `tenantId`, `slug`, `name`, `distanceKm`, `geohash`, `eligibility`, `eta`, `rating`, `isOpen`, `thumbnailUrl`, `ranking` | `cuisineTags`, `prepTimeMins`, `status`, `maxRadiusKm` |

**Implication:** Search must either extend presentation mapping or add `SearchResult` DTOs that carry cuisine/tags/food highlights without mutating frozen `NearbyRestaurant` until an ADR approves a additive DTO extension.

### 1.3 Discovery search stubs (contracts only)

| Surface | Status | Location |
|---------|--------|----------|
| `DiscoverySDK.searchByName` | `NOT_CONFIGURED` | `DefaultDiscoveryAdapter`, `StubDiscoveryAdapter` |
| `DiscoverySDK.searchByCuisine` | `NOT_CONFIGURED` | Same |
| `DiscoveryRepository.searchByName` | `NOT_CONFIGURED` | `TenantDiscoveryRepositoryAdapter`, `GeoIndexRepositoryAdapter` |
| `DiscoveryRepository.searchByCuisine` | `NOT_CONFIGURED` | Same |
| `DiscoveryQuery.searchText` | Forwarded, **ignored** by pipeline | `DiscoveryContext.ts` |
| `DiscoveryQuery.cuisineTags` | **Ranking signal only** (`cuisineMatch`) | `RankingSignals.ts` — not exclusion filter |
| `DiscoveryQuery.areaCode` | Forwarded, **unused** | — |
| `SearchFilter` DTO | Defined, unused | `src/sdk/discovery/dto/candidates.ts` |

**Frozen rule:** Discovery Repository **must not** implement search (contract § Stage Boundaries). M3 doc referenced “M3 PR-9: Search by cuisine/name” — **superseded by M4 Search Platform**. Discovery stubs remain frozen; Search owns all search semantics.

### 1.4 Current search in production code

| Surface | Scope | Mechanism | Cross-tenant? |
|---------|-------|-----------|---------------|
| `Menu.tsx` | Single tenant | Client filter: `name`, `category`, `description` + veg/price/popular | No |
| `StorefrontDesktopHeader.tsx` | Single tenant | Navigates to `/menu?search=` | No |
| `Home.tsx` | Single tenant | Search UI → `/menu` (query not propagated) | No |
| `AiOrderingWidget.tsx` | Single tenant | Voice/text live menu filter | No |
| `MarketplaceHomeStates.tsx` | Marketplace | Address geocode (location, not restaurant search) | N/A |
| `TenantsCrmPanel.tsx` | Admin | Client-side name/slug filter | Admin only |
| LocationSDK `searchAddress` | Address | Geocoding autocomplete | N/A |

**No cross-tenant restaurant, cuisine, food, or area search exists.**

### 1.5 Tenant / restaurant metadata

**Discovery read path** (`FirestoreTenantRepositoryAdapter` → `TenantReadRecord`):

| Field | Firestore source | Search utility |
|-------|------------------|----------------|
| `id`, `slug`, `name` | `tenants/{id}` | Name / prefix / contains |
| `status`, `storeStatus` | top-level | Availability filter |
| `location.lat/lng/geohash` | `location` | Geo (via Discovery, not Search direct) |
| `deliveryConfig.maxRadius`, `prepTime` | `deliveryConfig` | ETA eligibility (Discovery) |
| `storeOperations.isStoreOpen` | `storeOperations` | Open Now facet |
| `branding.logoUrl` | `branding` | Display |
| `cuisineTags` | `cuisineTags[]` | Cuisine filter |
| `ratingAggregate` | `ratingAggregate` | Rating facet |

**Not in discovery read (available in full `TenantInfo`):** structured India address codes (`areaCode`, `localityCode`, `cityCode`, `pincode`), `description`, `businessType`, custom tags beyond `cuisineTags`.

**Full tenant model:** `src/context/TenantContext.tsx` — richer than discovery subset. Search repository may need a **dedicated read port** for search-index fields without widening Discovery repository contract.

### 1.6 Menu / food item data

**`MenuItem`** (`src/types.ts`):

```
id, tenantId, name, description, price, category, image,
isAvailable, type (veg|non-veg), rating, isPopular, isBestSeller,
addons, stockCount, ...
```

**Firestore:** `menu` collection — `where("tenantId", "==", activeTenantId)` in `Menu.tsx`.  
**`categories` collection:** per-tenant, `isActive`, `priority`.

| Gap | Detail |
|-----|--------|
| No MenuSDK | Menu reads are presentation + Firestore direct (tenant storefront) |
| No cross-tenant menu index | Food-item search requires new read model / denormalized index |
| `src/domain/menu/` | `.gitkeep` only |

### 1.7 Tags & facets inventory

| Facet | Data source today | Search-ready? |
|-------|-------------------|---------------|
| Restaurant name | `tenants.name` | Partial (discovery read) |
| Cuisine | `tenants.cuisineTags[]` | Partial (not on `NearbyRestaurant`) |
| Food item | `menu.name`, `menu.description` | Per-tenant only |
| Area / locality | `TenantInfo.location` structured address | Not in discovery read |
| Pincode | `location.pincode` / ReferenceSDK | ReferenceSDK available; not wired |
| Tags | `cuisineTags` only | No general tag model |
| Open Now | `storeOperations.isStoreOpen` | In discovery candidate |
| Veg | `menu.type` / `isVegetarian` | Per-tenant menu only |
| Delivery time | `eta` on `NearbyRestaurant` | Post-discovery |
| Rating | `rating` / `ratingAggregate` | Partial |
| Distance | `distanceKm` | Post-discovery |

### 1.8 Prior architecture doc

`docs/m2/SEARCH-INTELLIGENCE-ARCHITECTURE.md` — M2 rule-based pipeline (geo → nearby → cuisine → area → rating → ETA → rank). **Superseded by M4 design** which places Search **above** frozen Discovery pipeline rather than embedding search in repository.

### 1.9 Audit summary

| Strength | Gap |
|----------|-----|
| Frozen discovery pipeline with explainable ranking | No SearchSDK / SearchFacade |
| `SearchFilter` / `DiscoveryQuery` search fields exist as DTOs | Fields unused end-to-end |
| Marketplace + session facade pattern | No marketplace search UI |
| Tenant `cuisineTags` in Firestore | Lost before `NearbyRestaurant` |
| Feature-flag pattern across SDKs | No `FF_SEARCH_*` flags |
| GeoIndex path for geo-constrained discovery | Search cannot call GeoIndex directly |

---

## 2. Search Platform Architecture

### 2.1 Layer diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                           │
│  MarketplaceSearchBar / SearchResultsPage (future PRs)          │
│  SearchFacade (src/lib/search/)                                  │
│  SearchSession (in-memory pub/sub — mirrors DiscoverySession)    │
└────────────────────────────┬────────────────────────────────────┘
                             │ SdkAsyncResult + view models only
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SearchSDK                                 │
│  search() · suggest() · autocomplete()                          │
│  Orchestrates: Normalize → SearchRepository → DiscoverySDK       │
└────────────┬───────────────────────────────┬────────────────────┘
             │                               │
             ▼                               ▼
┌────────────────────────┐    ┌─────────────────────────────────┐
│   SearchRepository     │    │         DiscoverySDK             │
│   (read-only ports)    │    │  discoverNearby / getCandidates  │
│   tenant · menu · tag  │    │  (frozen pipeline — no search)   │
│   indexes              │    └───────────────┬─────────────────┘
└────────────────────────┘                    │
             │                                ▼
             │              ┌─────────────────────────────────────┐
             │              │      Discovery Pipeline (frozen)     │
             │              │  Eligibility → Ranking → Result      │
             │              └───────────────┬─────────────────────┘
             │                              │
             └──────────┬───────────────────┘
                        ▼
              ┌──────────────────┐
              │  Search Filter   │  Intersect search hits ∩ discovery results
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │  Search Ranking  │  Text match + discovery rank composite
              └────────┬─────────┘
                       ▼
              ┌──────────────────┐
              │   SearchResult   │
              └────────┬─────────┘
                       ▼
              SearchFacade → Presentation
```

### 2.2 Boundary rules (immutable)

| Layer | May | Must NOT |
|-------|-----|----------|
| **Presentation** | Call `SearchFacade`, render `SearchResult` | Firestore, GeoIndex, DiscoverySDK, SearchSDK direct |
| **SearchFacade** | Feature flags, session, location context | Search ranking math, repository queries |
| **SearchSDK** | Orchestrate search pipeline, call DiscoverySDK | Firestore direct, modify Discovery pipeline |
| **SearchRepository** | Read-only search indexes (tenant, menu, tags) | GeoIndex direct, eligibility, discovery ranking |
| **DiscoverySDK** | Geo, eligibility, discovery ranking | Text/cuisine/food search (frozen) |
| **DiscoveryRepository** | Geo candidate reads | Search (frozen contract) |

### 2.3 Relationship to Discovery

- Search **consumes** `DiscoveryResult` — never bypasses eligibility or discovery ranking stages.
- Search **does not replace** `discoverNearby` — marketplace browse-without-query remains discovery-only.
- Search **adds** text/cuisine/food/area/tag intent on top of geo-eligible candidates.
- `DiscoverySDK.searchByName` / `searchByCuisine` remain frozen `NOT_CONFIGURED`; SearchSDK is the sole search entry (ADR note in §9).

### 2.4 Relationship to Marketplace

| Mode | Entry | Platform |
|------|-------|----------|
| Browse nearby | `MarketplaceHomeFacade` → `DiscoveryFacade` | Discovery only |
| Search intent | `SearchFacade` → `SearchSDK` → `DiscoverySDK` | Search + Discovery |

Marketplace will gain a search bar (future PR) that calls `SearchFacade`, not `DiscoveryFacade` directly.

### 2.5 Domain layout (planned — folders only in PR-1)

```
src/domain/search/
  normalize/       # Query tokenization, diacritics, synonym hooks
  matching/        # Exact, prefix, contains matchers
  ranking/         # Search-specific scoring (composite with discovery)
  filters/         # Facet evaluation (open now, veg, rating threshold)
  README.md
```

No business logic until PR-3+.

---

## 3. SearchSDK Design

### 3.1 Module location

```
src/sdk/search/
  contracts/SearchSDK.ts
  dto/
  filters/
  ranking/
  repository/
  providers/
  types/
  errors/
  pipeline/          # SearchPipeline orchestrator (PR-6+)
  adapters/
    DefaultSearchAdapter.ts
    StubSearchAdapter.ts
    notConfigured.ts
  createSearchSDK.ts
  version.ts
  README.md
  core/featureFlags.ts
  __tests__/
```

### 3.2 Public contract (`SearchSDK`)

| Method | Purpose | Default (flag OFF) |
|--------|---------|------------------|
| `search(query: SearchQuery)` | Full search pipeline → `SearchResult` | `NOT_CONFIGURED` |
| `suggest(query: SearchQuery)` | Lightweight suggestions (top N) | `NOT_CONFIGURED` |
| `autocomplete(partial: string, context)` | Prefix completions | `NOT_CONFIGURED` |

**Internal repository surface** (not on public SDK — called by adapter):

| Method | Purpose |
|--------|---------|
| `searchRestaurants(filter)` | Name/slug match |
| `searchCuisine(filter)` | Cuisine tag match |
| `searchFood(filter)` | Menu item match → tenant IDs |
| `searchArea(filter)` | Area/locality/pincode → tenant IDs |
| `searchTags(filter)` | Tag intersection |

### 3.3 Factory

```typescript
// createSearchSDK.ts — pattern matches createDiscoverySDK.ts
createSearchSDK(options?: CreateSearchSDKOptions): SearchSDK
```

**`CreateSearchSDKOptions`:**

| Option | Purpose |
|--------|---------|
| `discoverySdk` | Injected `DiscoverySDK` (required for production) |
| `searchRepository` | Port implementation |
| `providerKind` | `'stub' \| 'firestore-scan' \| 'index'` |
| `featureFlags` | Override for tests |

### 3.4 Versioning

```typescript
// version.ts
export const SEARCH_SDK_VERSION = '0.1.0-foundation' as const;
export const SEARCH_SDK_FROZEN = false as const;
export const SEARCH_SDK_MODULE = 'search' as const;
```

### 3.5 Error model

Mirror Discovery/Location pattern:

| Code | When |
|------|------|
| `NOT_CONFIGURED` | Flag OFF or stub provider |
| `VALIDATION` | Missing location, empty query |
| `NOT_FOUND` | Zero matches after filter |
| `UNAVAILABLE` | Repository/Discovery timeout |
| `FORBIDDEN` | Feature disabled |

### 3.6 Presentation facade (planned)

```
src/lib/search/
  SearchFacade.ts
  SearchSession.ts
  SearchContext.ts
  searchFeatureFlags.ts
  types.ts
```

`SearchFacade.search(query, deps)` — mirrors `DiscoveryFacade.discoverNearbyKitchens`.

### 3.7 SDK barrel export

`src/sdk/index.ts` does not export DiscoverySDK today. M4 PR-1 will add SearchSDK export strategy in README; public import path: `src/sdk/search/` (consistent with discovery).

---

## 4. DTO Design

All DTOs in `src/sdk/search/dto/` — **contracts only in PR-1**, no runtime logic.

### 4.1 `SearchQuery`

Customer search request (presentation → SearchFacade → SearchSDK).

```typescript
interface SearchQuery {
  /** Raw user input — normalized by pipeline */
  readonly text?: string;

  /** Geo anchor — required for marketplace search */
  readonly customerPoint: GeoPoint;
  readonly customerGeohash?: Geohash;

  /** Discovery context */
  readonly radiusKm?: number;
  readonly limit?: number;

  /** Structured filters */
  readonly filters?: SearchFilter;

  /** Sort override */
  readonly sort?: SortOption;

  /** Facets */
  readonly openNow?: boolean;
  readonly vegOnly?: boolean;
  readonly minRating?: number;
  readonly maxDeliveryMins?: number;
  readonly maxDistanceKm?: number;
}
```

### 4.2 `SearchFilter`

Composable filter bundle.

```typescript
interface SearchFilter {
  readonly restaurantName?: string;
  readonly cuisine?: CuisineFilter;
  readonly area?: AreaFilter;
  readonly tags?: TagFilter;
  readonly foodItem?: string;
}
```

### 4.3 `CuisineFilter`

```typescript
interface CuisineFilter {
  readonly tags: readonly string[];      // e.g. ['south-indian', 'biryani']
  readonly matchMode: 'any' | 'all';    // default 'any'
}
```

### 4.4 `AreaFilter`

```typescript
interface AreaFilter {
  readonly areaCode?: string;
  readonly localityName?: string;
  readonly cityName?: string;
  readonly pincode?: string;
  readonly districtName?: string;
}
```

### 4.5 `TagFilter`

```typescript
interface TagFilter {
  readonly tags: readonly string[];
  readonly matchMode: 'any' | 'all';
}
```

### 4.6 `SortOption`

```typescript
type SearchSortBy =
  | 'relevance'      // default — search rank composite
  | 'distance'
  | 'rating'
  | 'delivery_time'
  | 'popularity';

interface SortOption {
  readonly by: SearchSortBy;
  readonly direction: 'asc' | 'desc';
}
```

### 4.7 `SearchResult`

```typescript
interface SearchResult {
  readonly restaurants: readonly SearchRestaurantHit[];
  readonly totalMatches: number;
  readonly totalDiscoveryCandidates: number;
  readonly query: NormalizedSearchQuery;
  readonly metadata: SearchMetadata;
  readonly searchedAt: number;
}
```

### 4.8 `SearchRestaurantHit`

Extends discovery card with search context (does not mutate `NearbyRestaurant`).

```typescript
interface SearchRestaurantHit {
  readonly restaurant: NearbyRestaurant;   // from DiscoverySDK
  readonly match: SearchMatchExplanation;
  readonly highlights?: readonly SearchHighlight[];
  readonly matchedFoodItems?: readonly FoodItemHit[];
}
```

### 4.9 `SearchSuggestion`

```typescript
interface SearchSuggestion {
  readonly id: string;
  readonly label: string;
  readonly kind: 'restaurant' | 'cuisine' | 'food' | 'area' | 'tag';
  readonly payload?: Record<string, string>;
  readonly score: number;
}
```

### 4.10 `SearchMetadata`

```typescript
interface SearchMetadata {
  readonly normalizedText?: string;
  readonly appliedFilters: readonly string[];
  readonly discoveryQueryRadiusKm: number;
  readonly searchSdkVersion: string;
  readonly discoverySdkVersion: string;
  readonly timingMs?: SearchTimingMs;
  readonly flags: SearchPipelineFlags;
}
```

### 4.11 `SearchExplanation`

Explainable search breakdown (required for determinism audit).

```typescript
interface SearchExplanation {
  readonly matchType: 'exact' | 'prefix' | 'contains' | 'facet' | 'none';
  readonly field: string;           // 'name' | 'cuisineTags' | 'menu.name' | ...
  readonly signal: number;        // 0..1
  readonly weight: number;
  readonly contribution: number;
  readonly label: string;         // human-readable, e.g. "Exact name match"
}

interface SearchMatchExplanation {
  readonly score: number;
  readonly rank: number;
  readonly factors: readonly SearchExplanation[];
}
```

### 4.12 `SearchSession` (presentation)

```typescript
interface SearchSessionSnapshot {
  readonly status: 'idle' | 'loading' | 'success' | 'error' | 'disabled';
  readonly lastQuery: SearchQuery | null;
  readonly lastResult: SearchResult | null;
  readonly lastError: SearchPresentationError | null;
  readonly retryCount: number;
  readonly lastAttemptAt: number | null;
}
```

### 4.13 `NormalizedSearchQuery`

Output of normalize stage — stored in metadata for replay/debug.

```typescript
interface NormalizedSearchQuery {
  readonly tokens: readonly string[];
  readonly text?: string;
  readonly inferredCuisine?: readonly string[];
  readonly inferredArea?: AreaFilter;
}
```

### 4.14 `FoodItemHit` (food search)

```typescript
interface FoodItemHit {
  readonly itemId: string;
  readonly name: string;
  readonly category?: string;
  readonly matchType: 'exact' | 'prefix' | 'contains';
}
```

### 4.15 DTO index barrel

`src/sdk/search/dto/index.ts` — re-exports all public DTOs (pattern: `src/sdk/discovery/dto/index.ts`).

---

## 5. Repository Contracts

**Location:** `src/sdk/search/repository/SearchRepository.ts`  
**Rule:** Read-only. No Firestore types in contract. No GeoIndex port.

```typescript
interface SearchRepository {
  searchRestaurants(filter: RestaurantSearchFilter): SdkAsyncResult<SearchIndexHit[]>;
  searchCuisine(filter: CuisineSearchFilter): SdkAsyncResult<SearchIndexHit[]>;
  searchFood(filter: FoodSearchFilter): SdkAsyncResult<FoodSearchHit[]>;
  searchArea(filter: AreaSearchFilter): SdkAsyncResult<SearchIndexHit[]>;
  searchTags(filter: TagSearchFilter): SdkAsyncResult<SearchIndexHit[]>;
  suggest(filter: SuggestFilter): SdkAsyncResult<SearchSuggestion[]>;
  autocomplete(filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]>;
}
```

### 5.1 `SearchIndexHit` (repository output)

```typescript
interface SearchIndexHit {
  readonly tenantId: TenantId;
  readonly branchId: BranchId;
  readonly matchType: 'exact' | 'prefix' | 'contains';
  readonly field: string;
  readonly score: number;          // raw repository score pre-discovery
  readonly snippet?: string;
}
```

### 5.2 Filter DTOs (repository input)

| Filter | Key fields |
|--------|------------|
| `RestaurantSearchFilter` | `text`, `limit`, `tenantIds?` (discovery pre-filter) |
| `CuisineSearchFilter` | `tags`, `matchMode`, `limit` |
| `FoodSearchFilter` | `text`, `vegOnly?`, `limit` |
| `AreaSearchFilter` | `areaCode`, `localityName`, `pincode`, `cityName` |
| `TagSearchFilter` | `tags`, `matchMode` |
| `SuggestFilter` | `text`, `customerPoint`, `limit` |
| `AutocompleteFilter` | `prefix`, `kind?`, `limit` |

### 5.3 Port adapters (planned PRs)

| Adapter | Strategy | Flag |
|---------|----------|------|
| `StubSearchRepository` | `NOT_CONFIGURED` | default |
| `FirestoreScanSearchRepository` | Full collection scan + in-memory match | `FF_SEARCH_ENABLED` |
| `DenormalizedIndexSearchRepository` | Future `searchIndex` collection | post-M4 |

### 5.4 Menu read port (food search)

```typescript
interface MenuSearchPort {
  searchItemsByTenant(tenantId: TenantId, filter: FoodSearchFilter): SdkAsyncResult<FoodSearchHit[]>;
  searchItemsGlobal(filter: FoodSearchFilter): SdkAsyncResult<FoodSearchHit[]>;
}
```

Food search PR may require denormalized `menuSearchIndex` — documented in migration roadmap; no schema change in PR-1.

---

## 6. Search Strategy

### 6.1 Intent priority (match routing)

When `SearchQuery.text` is present, normalize then route by confidence:

| Priority | Intent | Repository method | Example |
|----------|--------|-------------------|---------|
| 1 | Restaurant name | `searchRestaurants` | "Meghana Foods" |
| 2 | Cuisine | `searchCuisine` | "South Indian" |
| 3 | Food item | `searchFood` | "biryani", "masala dosa" |
| 4 | Area / locality | `searchArea` | "Koregaon Park", "411001" |
| 5 | Tags | `searchTags` | "pure veg", "late night" |

Multiple intents may run in parallel; results merged by tenant ID with highest repository score winning.

### 6.2 Match types

| Type | Score base | Example |
|------|------------|---------|
| **Exact** | 1.0 | `name === query` |
| **Prefix** | 0.85 | `name.startsWith(query)` |
| **Contains** | 0.65 | `name.includes(query)` |
| **Facet** | 0.5 | `openNow`, `vegOnly`, `minRating` |

All matching is **case-insensitive**, **deterministic**, **diacritic-normalized** (domain `normalize/`).

### 6.3 Search ranking (composite)

After Discovery Filter intersects hits with `DiscoveryResult.restaurants`:

```
searchScore =
  w_exact   × exactMatchSignal +
  w_prefix  × prefixMatchSignal +
  w_contains× containsSignal +
  w_popularity × popularitySignal +
  w_distance × (1 / distanceNorm) +
  w_discovery × discoveryRankScore
```

**Default weights (M4 — hardcoded, explainable):**

| Signal | Weight | Source |
|--------|--------|--------|
| Exact match | 0.30 | Search repository |
| Prefix match | 0.20 | Search repository |
| Contains | 0.10 | Search repository |
| Popularity | 0.10 | `rating` + `isPopular` proxy |
| Distance | 0.15 | Discovery `distanceKm` |
| Discovery rank | 0.15 | `NearbyRestaurant.ranking.score` |

**Sort options** override composite: `SortOption.by` selects primary key; tie-break `tenantId` (stable).

### 6.4 Discovery ranking relationship

- Discovery ranking runs **unchanged** inside `discoverNearby`.
- Search ranking is a **second stage** — never modifies `RankingEngine` or `RankingPolicy`.
- When `sort.by === 'relevance'`, composite uses discovery rank as one factor.
- When `sort.by === 'distance'`, discovery distance order dominates.

### 6.5 Facet filters (post-discovery)

Applied after discovery eligibility (data already on `NearbyRestaurant` / `DiscoveryCandidate`):

| Facet | Rule |
|-------|------|
| Open Now | `isOpen === true` |
| Veg | Menu port: tenant has veg items matching query OR tenant-level veg flag (future) |
| Delivery time | `eta.totalMins <= maxDeliveryMins` |
| Rating | `rating >= minRating` |
| Distance | `distanceKm <= maxDistanceKm` |

### 6.6 Explainability

Every `SearchRestaurantHit` carries `SearchMatchExplanation.factors[]` — same audit standard as `RankingReason` in Discovery.

---

## 7. Pipeline Design

### 7.1 Search pipeline (frozen architecture)

```
Customer Query (SearchQuery)
        │
        ▼
┌───────────────┐
│   Normalize   │  tokenize, trim, infer cuisine/area hints
└───────┬───────┘
        ▼
┌───────────────┐
│Search Repository│  parallel: restaurants, cuisine, food, area, tags
└───────┬───────┘
        ▼
   SearchIndexHit[] (tenant IDs + match metadata)
        │
        ▼
┌───────────────┐
│ DiscoverySDK  │  discoverNearby(discoveryQuery)
│               │  discoveryQuery from customer location + radius
└───────┬───────┘
        ▼
   DiscoveryResult (geo-eligible ranked restaurants)
        │
        ▼
┌───────────────┐
│Discovery Filter│  intersect: discovery.tenantId ∈ searchHits
│               │  apply facets: openNow, rating, distance, ETA
└───────┬───────┘
        ▼
┌───────────────┐
│ Search Ranking│  composite score + SortOption
└───────┬───────┘
        ▼
┌───────────────┐
│ SearchResult  │  map hits + explanations + metadata
└───────┬───────┘
        ▼
   SearchFacade → Presentation
```

### 7.2 Stage boundaries

| Stage | Input | Output | May | Must NOT |
|-------|-------|--------|-----|----------|
| **Normalize** | `SearchQuery` | `NormalizedSearchQuery` | Tokenize, infer intent | Firestore, Discovery |
| **Search Repository** | Filters | `SearchIndexHit[]` | Read search indexes | Eligibility, GeoIndex, ranking |
| **DiscoverySDK** | `DiscoveryQuery` | `DiscoveryResult` | Full frozen pipeline | Search text matching |
| **Discovery Filter** | Hits + Result | Filtered hits | Set intersection, facets | Re-rank discovery |
| **Search Ranking** | Filtered hits | `SearchRestaurantHit[]` | Composite scoring | Firestore, modify discovery |
| **Result assembly** | Ranked hits | `SearchResult` | Map DTOs | Business logic in UI |
| **SearchFacade** | UI context | SDK calls | Flags, session | Direct repository |
| **Presentation** | View models | Render | UX | SDK, Firestore |

### 7.3 Empty-query behaviour

| Query | Behaviour |
|-------|-----------|
| No text, no filters | Delegate to `DiscoveryFacade.discoverNearbyKitchens` (browse mode) — SearchSDK returns NOT_FOUND or facade bypasses Search |
| Filters only (e.g. `openNow`) | Discovery pipeline + facet filter — no repository text search |
| Text + location | Full search pipeline |

### 7.4 Suggest / autocomplete pipeline

```
partial text → AutocompleteFilter
  → SearchRepository.autocomplete (prefix index)
  → SearchSuggestion[] (top 8)
```

Flag-gated: `FF_SEARCH_AUTOCOMPLETE_ENABLED`, `FF_SEARCH_SUGGESTIONS_ENABLED`.

### 7.5 Telemetry

`SearchPipelineTelemetry` (mirrors discovery):

| Field | Stage |
|-------|-------|
| `normalizeMs` | Normalize |
| `repositoryMs` | Search Repository |
| `discoveryMs` | DiscoverySDK |
| `filterMs` | Discovery Filter |
| `rankingMs` | Search Ranking |
| `searchHitCount` | Post-repository |
| `discoveryCount` | Post-discovery |
| `resultCount` | Final |

---

## 8. Feature Flags

### 8.1 SDK defaults (`src/sdk/search/core/featureFlags.ts`)

| Flag | Env key | Default | Stage |
|------|---------|---------|-------|
| `FF_SEARCH_ENABLED` | `VITE_FF_SEARCH_ENABLED` | **OFF** | Master gate |
| `FF_SEARCH_AUTOCOMPLETE_ENABLED` | `VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED` | **OFF** | Autocomplete |
| `FF_SEARCH_SUGGESTIONS_ENABLED` | `VITE_FF_SEARCH_SUGGESTIONS_ENABLED` | **OFF** | Suggest |

### 8.2 Presentation reader (`src/lib/search/searchFeatureFlags.ts`)

Pattern: identical to `discoveryFeatureFlags.ts` — `import.meta.env` → dev `localStorage` override.

### 8.3 Interaction with Discovery flags

| Discovery | Search | Behaviour |
|-----------|--------|-----------|
| OFF | OFF | No search, no discovery — storefront/marketing only |
| ON | OFF | Marketplace browse (M3 PR-8) |
| ON | ON | Marketplace browse + search bar |
| OFF | ON | SearchFacade returns `NOT_CONFIGURED` for discovery dependency |

**Production default:** all OFF — zero production impact.

### 8.4 `.env.example` entries (PR-1)

```env
# VITE_FF_SEARCH_ENABLED=false
# VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED=false
# VITE_FF_SEARCH_SUGGESTIONS_ENABLED=false
```

---

## 9. Migration Roadmap

### 9.1 Discovery stub deprecation

| Item | Action | When |
|------|--------|------|
| `DiscoverySDK.searchByName` | Remain `NOT_CONFIGURED`; document superseded by SearchSDK | M4 PR-1 docs |
| `DiscoverySDK.searchByCuisine` | Same | M4 PR-1 docs |
| `DiscoveryRepository.searchBy*` | Frozen — never implement | Permanent |
| `DiscoveryQuery.searchText` | Continue forward for discovery ranking context only | No change |
| M3 PR-9 (search in discovery) | **Cancelled** — replaced by M4 | This doc |

**ADR required** if `NearbyRestaurant` gains additive fields (`cuisineTags`) — propose in M4 PR-4.

### 9.2 Data migration phases

| Phase | Data | Approach |
|-------|------|----------|
| M4 PR-3 | Tenant name/cuisine | Firestore scan via `FirestoreScanSearchRepository` |
| M4 PR-5 | Menu food search | `MenuSearchPort` per-tenant batch read |
| M4 PR-7+ | Area/pincode | Wire ReferenceSDK + tenant structured address |
| Post-M4 | Search index collection | Denormalized `searchIndex/{tenantId}` — ADR + schema |

### 9.3 UI migration

| Current | Target |
|---------|--------|
| `Menu.tsx` client filter | Unchanged (single-tenant) |
| `Home.tsx` decorative search | Wire to tenant menu search (out of M4 scope) |
| `MarketplaceHome` | Add `SearchFacade` search bar (M4 PR-10) |
| `DiscoveryFacadeQuery.searchText` | Migrate to `SearchQuery.text` |

### 9.4 No-touch zones

- Checkout, payments, ordering flows
- Owner dashboard
- Discovery pipeline stages
- GeoIndex repository
- Firestore write schemas (read-only scan only until index ADR)

---

## 10. PR Breakdown

| PR | Scope | Flag | Deliverable |
|----|-------|------|-------------|
| **M4 PR-1** | SearchSDK foundation | — | Folder scaffold, contracts, DTOs, version, README, feature flags, stub adapter |
| **M4 PR-2** | Domain scaffold | — | `src/domain/search/` folders, README |
| **M4 PR-3** | SearchRepository — tenant scan | `FF_SEARCH_ENABLED` | `searchRestaurants`, `searchCuisine`, stub + firestore scan |
| **M4 PR-4** | SearchFacade + session | `FF_SEARCH_ENABLED` | `src/lib/search/`, tests |
| **M4 PR-5** | Food search | `FF_SEARCH_ENABLED` | `searchFood`, `MenuSearchPort` |
| **M4 PR-6** | Search pipeline | `FF_SEARCH_ENABLED` | `SearchPipeline.ts` — normalize → repo → discovery → filter → rank |
| **M4 PR-7** | Area / pincode search | `FF_SEARCH_ENABLED` | `searchArea`, ReferenceSDK integration |
| **M4 PR-8** | Tag search + facets | `FF_SEARCH_ENABLED` | `searchTags`, openNow/veg/rating filters |
| **M4 PR-9** | Suggest + autocomplete | `FF_SEARCH_*` | `suggest()`, `autocomplete()` |
| **M4 PR-10** | Marketplace search UI | `FF_SEARCH_ENABLED` | Search bar on `MarketplaceHome` |
| **M4 PR-11** | Search pipeline contract doc | — | Freeze `docs/m4/SEARCH-PIPELINE-CONTRACT.md` |

Each PR: tests, report in `docs/m4/PR-N-*.md`, flags default OFF.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Search bypasses Discovery | Medium | High — wrong eligibility | Contract tests; pipeline enforces intersection |
| Firestore scan latency at scale | High | Medium | Limit + geo pre-filter via Discovery; future index ADR |
| Duplicate search logic in React | Medium | Medium | Facade-only rule; lint guard |
| `DiscoverySDK.searchBy*` confusion | Medium | Low | Document supersession; keep NOT_CONFIGURED |
| Food search without index | High | Medium | Per-tenant menu batch; denormalize in phase 2 |
| Cuisine tags not on `NearbyRestaurant` | Medium | Low | `SearchRestaurantHit` wrapper DTO |
| Cross-platform drift (mobile/API) | Low | Medium | SearchSDK as single contract |
| Flag misconfiguration in prod | Medium | High | All default OFF; master gate |
| Normalization locale issues | Medium | Low | India-first; English tokens M4 |

---

## 12. Definition of Ready (ARB approval gate)

Before **M4 PR-1** implementation begins:

- [x] Repository audit complete (§1)
- [x] Search platform architecture approved (§2)
- [x] SearchSDK contract designed (§3)
- [x] DTOs specified (§4)
- [x] Repository interfaces specified (§5)
- [x] Search strategy documented (§6)
- [x] Pipeline design frozen (§7)
- [x] Feature flags defined (§8)
- [x] Migration roadmap agreed (§9)
- [x] PR breakdown agreed (§10)
- [x] Risks acknowledged (§11)
- [ ] **Architecture Review Board sign-off**
- [ ] No objection from Discovery platform owner (frozen contract preserved)
- [ ] ADR filed if `NearbyRestaurant` extension required (deferred to PR-4)

---

## 13. Definition of Done (M4 platform complete)

M4 is **done** when all of the following are true (post PR-11):

- [ ] `SearchSDK` follows OrderSDK / LocationSDK / DiscoverySDK patterns
- [ ] Search consumes `DiscoveryResult` — never bypasses Discovery pipeline
- [ ] Search never accesses Firestore or GeoIndex from presentation
- [ ] All search methods return explainable `SearchExplanation` factors
- [ ] Search ranking is deterministic with stable `tenantId` tie-break
- [ ] `FF_SEARCH_ENABLED`, `FF_SEARCH_AUTOCOMPLETE_ENABLED`, `FF_SEARCH_SUGGESTIONS_ENABLED` default **OFF**
- [ ] Zero production impact with flags OFF
- [ ] Marketplace search bar behind `FF_SEARCH_ENABLED`
- [ ] `npm run test:sdk` includes search facade + pipeline tests
- [ ] `docs/m4/SEARCH-PIPELINE-CONTRACT.md` frozen
- [ ] No checkout, ordering, payment, or discovery pipeline changes
- [ ] Migration path documented for denormalized search index (future ADR)

---

## Success Criteria Checklist

| Criterion | Status |
|-----------|--------|
| SearchSDK follows OrderSDK, LocationSDK, DiscoverySDK architecture | ✅ Designed |
| Search consumes Discovery | ✅ Pipeline §7 |
| Search never bypasses Discovery | ✅ Intersection stage |
| Search is explainable | ✅ `SearchExplanation` DTO |
| Search is deterministic | ✅ Stable sort + no ML |
| Feature flags OFF by default | ✅ §8 |
| Zero production impact | ✅ Flags + no UI in this milestone |
| No implementation in this milestone | ✅ STOP |

---

## Related Documents

| Document | Path |
|----------|------|
| M2 search architecture (superseded) | `docs/m2/SEARCH-INTELLIGENCE-ARCHITECTURE.md` |
| Discovery pipeline contract (frozen) | `docs/m3/DISCOVERY-PIPELINE-CONTRACT.md` |
| Discovery platform | `docs/m3/DISCOVERY-INTELLIGENCE-PLATFORM.md` |
| Marketplace home (M3 PR-8) | `docs/m3/PR-8-MARKETPLACE-HOME-REPORT.md` |
| M4 phase-1 audit (detailed) | `docs/m4/PHASE-1-REPOSITORY-AUDIT.md` |

---

*Search Intelligence Platform — architecture only. Await ARB approval before M4 PR-1.*
