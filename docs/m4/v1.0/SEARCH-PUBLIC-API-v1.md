# Search Public API v1.0

**Status:** Frozen — M4 PR-10  
**Date:** 2026-06-26  
**Module:** `src/sdk/search/`  
**Contract file:** `src/sdk/search/contracts/SearchSDK.ts`

---

## 1. SearchSDK (frozen surface)

Presentation **must not** import SearchSDK directly in production UI — use `SearchFacade`. SDK is the certified boundary for tests, future npm package, and server adapters.

### Factory

```typescript
createSearchSDK(options?: CreateSearchSDKOptions): SearchSDK
```

| Option | Purpose |
|--------|---------|
| `featureFlags` | Override `FF_SEARCH_*` reader |
| `discoveryFeatureFlags` | Discovery enrichment gate |
| `searchRepository` | Inject repository (tests) |
| `discoverySdk` | Inject DiscoverySDK (tests) |
| `firestoreSearchPort` | Firestore read port |

When `FF_SEARCH_ENABLED` is OFF → `StubSearchAdapter` (all methods `NOT_CONFIGURED`).

---

### `search(query: SearchQuery): SdkAsyncResult<SearchResult>`

**Purpose:** Full marketplace search with optional Discovery enrichment.

**Input — `SearchQuery`:**

| Field | Required | Notes |
|-------|----------|-------|
| `customerPoint` | Yes | `{ lat, lng }` geo anchor |
| `text` | No* | Raw user query |
| `customerGeohash` | No | Discovery context |
| `radiusKm`, `limit` | No | Passed to Discovery |
| `openNow`, `vegOnly`, `minRating`, `maxDeliveryMins`, `maxDistanceKm` | No | Post-enrichment facets |
| `filters` | No | Structured cuisine/area/tags |

\* At least one of `text` or facet fields required (validated).

**Output — `SearchResult`:**

| Field | Type |
|-------|------|
| `restaurants` | `SearchRestaurantHit[]` |
| `totalMatches` | `number` |
| `totalDiscoveryCandidates` | `number` |
| `query` | `NormalizedSearchQuery` |
| `metadata` | `SearchMetadata` (timing, flags, correlationId) |
| `searchedAt` | `number` |

**Errors:** `NOT_CONFIGURED`, `VALIDATION`, `UNAVAILABLE`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`

---

### `suggest(query: SearchQuery): SdkAsyncResult<SearchSuggestion[]>`

**Purpose:** Lightweight suggestion list (focus panel, empty prefix).

**Gate:** `FF_SEARCH_ENABLED` + `FF_SEARCH_SUGGESTIONS_ENABLED` + `FF_SEARCH_REPOSITORY_ENABLED`

**Input:** `SearchQuery` — `customerPoint` required; `text` optional.

**Output:** `SearchSuggestion[]` (max `limit`, default 12)

---

### `autocomplete(filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]>`

**Purpose:** Prefix completions for search bar.

**Gate:** `FF_SEARCH_ENABLED` + `FF_SEARCH_AUTOCOMPLETE_ENABLED` + `FF_SEARCH_REPOSITORY_ENABLED`

**Input — `AutocompleteFilter`:**

| Field | Required |
|-------|----------|
| `prefix` | Yes (min 2 chars for results) |
| `kind` | No (`restaurant` \| `cuisine` \| …) |
| `customerPoint` | No |
| `limit` | No (default 8) |

**Output:** `SearchSuggestion[]`

---

## 2. SearchFacade (presentation API)

**Module:** `src/lib/search/SearchFacade.ts`

| Function | Purpose |
|----------|---------|
| `searchRestaurants(query, deps?)` | Primary search entry |
| `autocompleteSearch(prefix, deps?)` | Autocomplete wrapper |
| `suggestSearch(text, deps?)` | Suggestions wrapper |
| `retrySearch(deps?)` | Retry last query (max 3) |
| `cancelSearch()` | Cancel in-flight search |
| `buildSearchContext(input)` | Query builder (internal/testing) |

**Session:** `subscribeSearchSession`, `getSearchSessionSnapshot`, `resetSearchSession`  
**Telemetry:** `getSearchTelemetrySnapshot`, `resetSearchTelemetry`

---

## 3. Marketplace facades

| Module | Entry points |
|--------|--------------|
| `MarketplaceSearchFacade` | `searchMarketplaceHome`, filters, sort, retry, analytics |
| `MarketplaceAutocompleteFacade` | `loadMarketplaceAutocomplete`, tracking helpers |

---

## 4. DTO exports (frozen)

Barrel: `src/sdk/search/dto/`

| DTO | Role |
|-----|------|
| `SearchQuery`, `NormalizedSearchQuery` | Input |
| `SearchResult`, `SearchRestaurantHit`, `SearchMetadata` | Output |
| `SearchSuggestion`, `AutocompleteFilter`, `SuggestFilter` | Suggestions |
| `SearchIndexHit` | Repository hits |
| `SearchMatchExplanation`, `SearchHighlight` | Explainability |

---

## 5. Error model

All SDK methods return `SdkAsyncResult<T>`:

```typescript
{ ok: true, value: T } | { ok: false, error: SdkError }
```

Presentation maps via `normalizeSearchError()` → `SearchPresentationError` with `userMessage` and `retryable`.

---

## 6. Version constants

| Constant | Current | Post-ARB target |
|----------|---------|-----------------|
| `SEARCH_SDK_VERSION` | `0.1.0-foundation` | `1.0.0` |
| `SEARCH_SDK_FROZEN` | `false` | `true` |
| `SEARCH_SDK_MODULE` | `search` | unchanged |

Version echoed in `SearchResult.metadata.searchSdkVersion`.

---

## 7. Non-public (internal — not frozen for consumers)

- `SearchRepository` implementations
- `SearchDiscoveryEnricher`, orchestrators, mappers
- `FirestoreScanSearchProvider`
- Domain normalizers (`src/domain/search/`)

External consumers must depend only on `SearchSDK` + DTOs + `SearchFacade` patterns documented here.
