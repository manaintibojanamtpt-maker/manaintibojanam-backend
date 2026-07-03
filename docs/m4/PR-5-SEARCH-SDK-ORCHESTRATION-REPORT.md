# M4 PR-5 — SearchSDK Orchestration Report

**PR:** BHOS-M4-PR5  
**Date:** 2026-06-26  
**Status:** ✅ Complete — SDK orchestration, no UI

---

## 1. SDK Architecture

```
SearchFacade
      ↓
createSearchSDK({ featureFlags })
      ↓
FF_SEARCH_ENABLED OFF → StubSearchAdapter
FF_SEARCH_ENABLED ON  → DefaultSearchAdapter
      ↓
SearchRepository (mock / stub / Firestore via factory)
```

**New modules:**

| Path | Role |
|------|------|
| `adapters/DefaultSearchAdapter.ts` | `search()` orchestration |
| `validation/validateSearchQuery.ts` | SDK-layer query validation |
| `pipeline/SearchRepositoryOrchestrator.ts` | Repository invocation + hit merge |
| `pipeline/SearchResultMapper.ts` | `SearchIndexHit[]` → `SearchResult` |
| `pipeline/searchPipelineTelemetry.ts` | Timing helpers |
| `pipeline/resolvePipelineFlags.ts` | Pipeline flag metadata |
| `pipeline/mapRepositoryError.ts` | Repository error normalization |

---

## 2. Orchestration Flow

1. `validateSearchQuery()` — customer point, intent, facet rules (domain)
2. Gate on `FF_SEARCH_REPOSITORY_ENABLED` — early `REPOSITORY_UNAVAILABLE` when off
3. `invokeSearchRepository()` — route to `searchRestaurants` / `searchCuisine` / `searchArea` / `searchTags`
4. Intersect hits when multiple structured filters apply
5. `mapSearchIndexHitsToResult()` — presentation-ready `SearchResult`
6. `suggest()` / `autocomplete()` remain `NOT_CONFIGURED`

---

## 3. Repository Integration

- `createSearchSDK()` delegates repository creation to `SearchRepositoryFactory`
- Injectable `searchRepository` for tests (mock only — no live Firestore)
- Repository `NOT_CONFIGURED` mapped to `UNAVAILABLE` / `REPOSITORY_UNAVAILABLE`
- No repository contract changes

---

## 4. Result Mapping

| Source | Target |
|--------|--------|
| `SearchIndexHit` | `SearchRestaurantHit` with placeholder `NearbyRestaurant` |
| Match metadata | `SearchMatchExplanation` |
| Snippet | `SearchHighlight` |
| Domain normalizer | `NormalizedSearchQuery` in result |
| Pipeline flags | `SearchMetadata.flags` |

Discovery enrichment (distance, eligibility, open state) deferred to **M4 PR-6**.

---

## 5. Telemetry

`SearchMetadata.timingMs`:

| Field | Stage |
|-------|-------|
| `normalizeMs` | Query validation / normalization |
| `repositoryMs` | Repository invocation |
| `totalMs` | End-to-end adapter |

---

## 6. Testing

**File:** `src/sdk/__tests__/searchSdkOrchestration.test.ts` (14 cases)

| Case | Status |
|------|--------|
| Flag OFF → stub | ✅ |
| Flag ON → default adapter | ✅ |
| Repository disabled | ✅ |
| Successful search | ✅ |
| Empty results | ✅ |
| Validation failure | ✅ |
| Repository error | ✅ |
| Telemetry in metadata | ✅ |
| Cuisine path | ✅ |
| Multi-filter intersection | ✅ |
| Facet-only (empty, no repo call) | ✅ |
| suggest/autocomplete NOT_CONFIGURED | ✅ |
| Stub rollback path | ✅ |

Run: `npm run test:sdk`

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Placeholder `NearbyRestaurant` in production | Discovery enrichment in PR-6; flags default OFF |
| Facet-only queries return empty | Documented; full facet pipeline in PR-6/PR-8 |
| Multi-filter intersection too strict | Matches architecture intent; tunable in PR-6 |
| Facade/SDK flag drift | `SearchFacade` passes `readSearchFeatureFlag` to `createSearchSDK` |

---

## 8. Rollback

Set `FF_SEARCH_ENABLED=false` → `StubSearchAdapter` (instant). Delete `DefaultSearchAdapter` + pipeline modules to fully revert.

---

## 9. Definition of Done

- [x] `DefaultSearchAdapter` with `search()` orchestration
- [x] `createSearchSDK()` flag wiring (OFF stub / ON default)
- [x] Repository invocation without Firestore in tests
- [x] `SearchResult` mapping from `SearchIndexHit[]`
- [x] SDK telemetry in metadata
- [x] No DiscoverySDK / Discovery pipeline changes
- [x] No Marketplace UI, autocomplete, suggestions, ranking integration
- [x] Mock repository tests only

**Awaiting ARB approval before M4 PR-6 (discovery-enriched pipeline) or PR-10 (Marketplace search UI).**

---

## Related

- [`PR-4-SEARCH-FACADE-REPORT.md`](./PR-4-SEARCH-FACADE-REPORT.md)
- [`PR-3-SEARCH-REPOSITORY-REPORT.md`](./PR-3-SEARCH-REPOSITORY-REPORT.md)
- [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)
