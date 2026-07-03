# Search Pipeline Contract v1.0 (Frozen)

**Status:** ✅ Frozen — M4 PR-10  
**Date:** 2026-06-26  
**Supersedes:** Informal pipeline descriptions in M4 PR-5/PR-6 reports  
**Related:** [Discovery Pipeline Contract](../../m3/DISCOVERY-PIPELINE-CONTRACT.md) · ADR-014

---

## 1. Pipeline (v1.0)

### Full search

```
SearchFacadeQuery (presentation)
        │
        ▼
SearchContext.buildSearchContext()
        │
        ▼
SearchQuery (SDK DTO)
        │
        ▼
SearchSDK.search()
        │
        ├── validateSearchQuery()
        ├── invokeSearchRepository()  → SearchIndexHit[]
        ├── enrichSearchWithDiscovery()  → DiscoverySDK.discoverNearby (read-only)
        └── mapSearchIndexHitsToResult()  → SearchResult
        │
        ▼
SearchFacade → Presentation view models
```

### Autocomplete (v1.0)

```
AutocompleteFilter
        │
        ▼
SearchSDK.autocomplete()  [FF_SEARCH_AUTOCOMPLETE_ENABLED]
        │
        ▼
invokeSearchAutocomplete()
        ├── repository.searchRestaurants(prefix)
        └── SuggestionCatalog (cuisine prefix)
        │
        ▼
SearchSuggestion[]
```

### Suggestions (v1.0)

```
SearchQuery (text optional)
        │
        ▼
SearchSDK.suggest()  [FF_SEARCH_SUGGESTIONS_ENABLED]
        │
        ▼
invokeSearchSuggest()
        ├── static catalogs (popular / nearby / trending placeholder)
        └── repository.searchRestaurants / searchCuisine (when text ≥ 2)
        │
        ▼
SearchSuggestion[]
```

---

## 2. Search → Discovery contract (immutable)

| Rule | v1.0 behaviour |
|------|----------------|
| Direction | Search **consumes** DiscoverySDK — Discovery **never** calls SearchSDK |
| Discovery pipeline | **Unmodified** — eligibility, ranking, repository stages frozen |
| Discovery stubs | `searchByName` / `searchByCuisine` remain `NOT_CONFIGURED` permanently |
| Enrichment gate | `FF_SEARCH_ENABLED` + `FF_DISCOVERY_ENABLED` required for enrichment |
| Fallback | Repository placeholder cards when Discovery unavailable |
| Intersection | `intersectSearchHitsWithDiscovery` preserves Discovery ranking order |
| Correlation | `correlationId` generated in enricher; propagated to `SearchMetadata` |
| Facets post-enrichment | `openNow`, `minRating`, `maxDistanceKm`, `maxDeliveryMins` — filter only, no re-rank |

### Discovery query mapping

`buildDiscoveryQueryFromSearch()` forwards:

- `customerPoint`, `customerGeohash`, `radiusKm`
- Cuisine context from normalized query (ranking signal only in Discovery)

Discovery **must not** implement text search or repository scans for search semantics.

---

## 3. Stage boundaries

| Stage | Input | Output | May | Must NOT |
|-------|-------|--------|-----|----------|
| **Presentation** | User input | Facade calls | Render, debounce, session | Firestore, direct SDK |
| **SearchFacade** | `SearchFacadeQuery` | `SearchResult` / errors | Flags, telemetry, session | Repository, ranking math |
| **SearchSDK** | `SearchQuery` | `SearchResult` / suggestions | Validate, orchestrate, enrich | Firestore, UI |
| **SearchRepository** | Filters | `SearchIndexHit[]` | Read tenant index | Rank, Discovery, UI |
| **DiscoverySDK** | `DiscoveryQuery` | `DiscoveryResult` | Frozen pipeline | Search repository reads |

---

## 4. Repository contract (frozen)

`SearchRepository` methods — **no v1.0 changes permitted:**

| Method | v1.0 status |
|--------|-------------|
| `searchRestaurants` | Implemented (Firestore scan) |
| `searchCuisine` | Implemented |
| `searchArea` | Implemented |
| `searchTags` | Implemented |
| `searchFood` | `NOT_CONFIGURED` |
| `suggest` | `NOT_CONFIGURED` (SDK orchestrator uses reads) |
| `autocomplete` | `NOT_CONFIGURED` (SDK orchestrator uses reads) |

---

## 5. Feature flags

| Flag | Default | Gates |
|------|---------|-------|
| `FF_SEARCH_ENABLED` | OFF | Master SearchSDK |
| `FF_SEARCH_REPOSITORY_ENABLED` | OFF | Firestore repository |
| `FF_SEARCH_AUTOCOMPLETE_ENABLED` | OFF | `SearchSDK.autocomplete` |
| `FF_SEARCH_SUGGESTIONS_ENABLED` | OFF | `SearchSDK.suggest` |

Discovery flags (`FF_DISCOVERY_*`) remain independent — see Discovery contract.

---

## 6. Versioning

| Artifact | v1.0 identifier |
|----------|-----------------|
| Search Platform release | `1.0.0` |
| Runtime constant (pre-freeze) | `SEARCH_SDK_VERSION = 0.1.0-foundation` |
| Post-ARB target | `SEARCH_SDK_VERSION = 1.0.0`, `SEARCH_SDK_FROZEN = true` |
| Pipeline contract | `SEARCH-PIPELINE-CONTRACT-v1.md` (this document) |

Breaking changes to stage inputs/outputs require ADR + major version bump.

---

## 7. Explicit exclusions (v1.0)

- AI / semantic / embedding search
- Global food item search (`searchFood` not wired)
- Discovery repository search implementation
- Dedicated search index collection (post-v1 ADR)
- Write paths / Firestore mutations
