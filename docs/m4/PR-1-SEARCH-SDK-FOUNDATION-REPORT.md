# M4 PR-1 — SearchSDK Foundation Report

**PR:** BHOS-M4-PR1  
**Date:** 2026-06-26  
**Version:** `SEARCH_SDK_VERSION = 0.1.0-foundation`  
**Status:** ✅ Complete — contracts only, stub adapter, zero production impact

---

## 1. Files Created

### SearchSDK (`src/sdk/search/`)

| Path | Purpose |
|------|---------|
| `version.ts` | `SEARCH_SDK_VERSION`, `SEARCH_SDK_FROZEN` |
| `shared/constants.ts` | `SEARCH_SDK_MODULE` |
| `shared/options.ts` | `CreateSearchSDKOptions` |
| `core/featureFlags.ts` | Flag defaults + env keys |
| `contracts/SearchSDK.ts` | Public interface |
| `dto/query.ts` | `SearchQuery`, `NormalizedSearchQuery` |
| `dto/filters.ts` | `SearchFilter`, `CuisineFilter`, `AreaFilter`, `TagFilter` |
| `dto/sort.ts` | `SortOption` |
| `dto/results.ts` | `SearchResult`, `SearchRestaurantHit`, `SearchMetadata` |
| `dto/suggestions.ts` | `SearchSuggestion`, `SuggestFilter`, `AutocompleteFilter` |
| `dto/explanation.ts` | `SearchExplanation`, `SearchMatchExplanation` |
| `dto/food.ts` | `FoodItemHit` |
| `dto/repository.ts` | `SearchIndexHit`, repository filter DTOs |
| `dto/session.ts` | `SearchSessionSnapshot` |
| `dto/index.ts` | DTO barrel |
| `repository/SearchRepository.ts` | Repository port (interface only) |
| `ranking/SearchRankingEngine.ts` | Ranking port + `SEARCH_RANKING_WEIGHTS` |
| `ranking/README.md` | Ranking placeholder doc |
| `filters/SearchFilters.ts` | `SearchFilterStage` types |
| `filters/README.md` | Filters placeholder doc |
| `providers/README.md` | Provider placeholder doc |
| `errors/searchErrors.ts` | Error message constants |
| `types/branded.ts` | Branded search types |
| `types/index.ts` | Type barrel |
| `adapters/notConfigured.ts` | `NOT_CONFIGURED` helpers |
| `adapters/StubSearchAdapter.ts` | Stub implementing `SearchSDK` |
| `createSearchSDK.ts` | Factory |
| `README.md` | Module documentation |

### Domain (`src/domain/search/`)

| Path | Purpose |
|------|---------|
| `README.md` | Domain boundary documentation |
| `normalize/.gitkeep` | Placeholder |
| `matching/.gitkeep` | Placeholder |
| `filters/.gitkeep` | Placeholder |
| `ranking/.gitkeep` | Placeholder |

### Tests & config

| Path | Purpose |
|------|---------|
| `src/sdk/__tests__/searchSdkFoundation.test.ts` | Foundation tests |
| `.env.example` | Search flag entries (commented) |
| `package.json` | `test:sdk` includes search foundation test |

**Not created (by design):** `DefaultSearchAdapter`, repository implementations, pipeline, SearchFacade, UI, Firestore adapters.

---

## 2. Architecture

```
Presentation (future)
        ↓
SearchFacade (M4 PR-4)
        ↓
SearchSDK ← createSearchSDK() → StubSearchAdapter
        ↓
DiscoverySDK (injected in future PRs)
        ↓
Discovery Pipeline (frozen — unchanged)
```

PR-1 establishes the **contract shell** only. All public methods return `NOT_CONFIGURED`.

---

## 3. SDK Contracts

### `SearchSDK` (`contracts/SearchSDK.ts`)

| Method | Input | Output |
|--------|-------|--------|
| `search` | `SearchQuery` | `SdkAsyncResult<SearchResult>` |
| `suggest` | `SearchQuery` | `SdkAsyncResult<SearchSuggestion[]>` |
| `autocomplete` | `AutocompleteFilter` | `SdkAsyncResult<SearchSuggestion[]>` |

### `SearchRepository` (port only)

`searchRestaurants`, `searchCuisine`, `searchFood`, `searchArea`, `searchTags`, `suggest`, `autocomplete`

### `SearchRankingEngine` (port only)

`rank(hits, context)` — implementation deferred to M4 PR-6.

### Factory

```typescript
createSearchSDK(options?: CreateSearchSDKOptions): SearchSDK
```

PR-1 always returns `StubSearchAdapter` regardless of options.

---

## 4. DTO Overview

| DTO | Role |
|-----|------|
| `SearchQuery` | Customer request with geo anchor + facets |
| `SearchFilter` | Structured cuisine/area/tag/food filters |
| `SearchResult` | Ranked `SearchRestaurantHit[]` + metadata |
| `SearchRestaurantHit` | `NearbyRestaurant` + match explanation |
| `SearchSuggestion` | Autocomplete/suggest entries |
| `SearchExplanation` | Explainable factor breakdown |
| `SearchSessionSnapshot` | Presentation session (for future facade) |
| `SearchIndexHit` | Repository-layer match before discovery filter |

All DTOs are **read-only interfaces** — no serializers, no mappers, no runtime logic.

---

## 5. Feature Flags

| Flag | Env key | Default |
|------|---------|---------|
| `FF_SEARCH_ENABLED` | `VITE_FF_SEARCH_ENABLED` | **OFF** |
| `FF_SEARCH_AUTOCOMPLETE_ENABLED` | `VITE_FF_SEARCH_AUTOCOMPLETE_ENABLED` | **OFF** |
| `FF_SEARCH_SUGGESTIONS_ENABLED` | `VITE_FF_SEARCH_SUGGESTIONS_ENABLED` | **OFF** |

Defined in `src/sdk/search/core/featureFlags.ts`. Presentation reader (`src/lib/search/searchFeatureFlags.ts`) arrives in M4 PR-4.

---

## 6. Testing

**File:** `src/sdk/__tests__/searchSdkFoundation.test.ts`

| Test | Assertion |
|------|-----------|
| Version export | `0.1.0-foundation` |
| Frozen flag | `false` |
| Module id | `search` |
| All flags default OFF | ✅ |
| Env key mapping | `VITE_FF_*` |
| Ranking weights sum to 1.0 | ✅ |
| `createSearchSDK().search()` | `NOT_CONFIGURED` |
| `suggest()` | `NOT_CONFIGURED` |
| `autocomplete()` | `NOT_CONFIGURED` |

Run: `npm run test:sdk`

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Accidental Firestore in SDK | No repository adapters in PR-1 |
| Discovery pipeline modification | Zero discovery file changes |
| Premature UI wiring | No SearchFacade or React files |
| Contract drift from architecture doc | DTOs match `SEARCH-INTELLIGENCE-PLATFORM.md` §4 |
| Production impact | Stub only; all flags OFF |

---

## 8. Rollback

1. Delete `src/sdk/search/` and `src/domain/search/`
2. Remove `searchSdkFoundation.test.ts` from `test:sdk` script
3. Revert `.env.example` search flag comments

No runtime behaviour changes — rollback is file deletion only.

---

## 9. Definition of Done

- [x] `src/sdk/search/` scaffold with contracts, DTOs, types, errors, version, README
- [x] Public API: `search()`, `suggest()`, `autocomplete()`
- [x] Factory: `createSearchSDK()`
- [x] `SEARCH_SDK_VERSION = 0.1.0-foundation`, `SEARCH_SDK_FROZEN = false`
- [x] `SearchRepository` interface only — no implementation
- [x] `SearchRankingEngine` port only — no implementation
- [x] `StubSearchAdapter` returns `NOT_CONFIGURED` for all methods
- [x] Feature flags defined, all default OFF
- [x] `src/domain/search/` folder placeholders only
- [x] No Firestore, UI, React, Discovery changes
- [x] Foundation tests pass
- [x] `.env.example` updated

**Awaiting approval before M4 PR-2.**

---

## Related

- [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)
- [`PHASE-1-REPOSITORY-AUDIT.md`](./PHASE-1-REPOSITORY-AUDIT.md)
