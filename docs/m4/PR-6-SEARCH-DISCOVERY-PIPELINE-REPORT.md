# M4 PR-6 — Discovery-Enriched Search Pipeline Report

**PR:** BHOS-M4-PR6  
**Date:** 2026-06-26  
**Status:** ✅ Complete — discovery enrichment, no UI

---

## 1. Pipeline Architecture

```
SearchRepository → SearchIndexHit[]
        ↓
SearchDiscoveryEnricher
        ↓
DiscoverySDK.discoverNearby()
        ↓
Discovery Pipeline → DiscoveryResult
        ↓
DiscoveryIntersection
        ↓
SearchCandidateMapper
        ↓
SearchResultMapper → SearchResult
```

Search consumes Discovery. Discovery never consumes Search.

---

## 2. Discovery Integration

| Module | Role |
|--------|------|
| `buildDiscoveryQuery.ts` | `SearchQuery` → `DiscoveryQuery` (geo context forward only) |
| `SearchDiscoveryEnricher.ts` | Calls `DiscoverySDK`, handles fallback |
| `DiscoveryIntersection.ts` | Intersects hits ∩ discovery restaurants by `tenantId` |
| `resolveDiscoveryEnrichment.ts` | Requires `FF_SEARCH_ENABLED` + `FF_DISCOVERY_ENABLED` |

`createSearchSDK()` injects `DiscoverySDK` (mock in tests). `SearchFacade` passes both search and discovery feature flag readers.

---

## 3. SearchResult Enrichment

| Discovery owns | Search owns |
|----------------|-------------|
| Distance | Text/cuisine/area/tag match explanation |
| Eligibility | Facet filtering (openNow, rating, ETA, distance caps) |
| Ranking order | Intersection only — **no re-ranking** |
| ETA, open status | Highlights from repository hits |

When enrichment is off or fails → safe fallback to PR-5 placeholder `NearbyRestaurant` mapping.

---

## 4. Telemetry

`SearchMetadata` extensions:

| Field | Description |
|-------|-------------|
| `correlationId` | Per-search attempt trace ID |
| `discoveryEnrichmentEnabled` | Whether Discovery enrichment applied |
| `discoveryEnrichmentFallbackReason` | Why fallback was used |
| `discoverySdkVersion` | Discovery SDK version when enriched |
| `timingMs.discoveryMs` | Discovery call duration |
| `timingMs.filterMs` | Intersection + facet filter duration |

---

## 5. Testing

**File:** `src/sdk/__tests__/searchDiscoveryPipeline.test.ts` (12 cases)

| Case | Status |
|------|--------|
| Discovery query mapping | ✅ |
| Intersection preserves discovery order | ✅ |
| Repository + discovery success | ✅ |
| Repository empty (skip discovery) | ✅ |
| Discovery empty | ✅ |
| Partial enrichment | ✅ |
| FF_DISCOVERY_ENABLED off fallback | ✅ |
| Discovery NOT_CONFIGURED fallback | ✅ |
| Discovery UNAVAILABLE fallback | ✅ |
| Correlation ID propagation | ✅ |
| Factory wiring both flags | ✅ |
| openNow facet filter | ✅ |

Mock `DiscoverySDK` only — no live Firestore.

Run: `npm run test:sdk`

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Search bypasses discovery ranking | Intersection preserves `DiscoveryResult` order |
| Discovery failure blocks search | Safe fallback to placeholder results |
| Flag misconfiguration | Both flags required for enrichment; defaults OFF |
| Facet filter without menu veg data | `vegOnly` deferred — no false negatives on `NearbyRestaurant` |

---

## 7. Rollback

Set `FF_DISCOVERY_ENABLED=false` → repository-only placeholder mapping (PR-5 behaviour). Set `FF_SEARCH_ENABLED=false` → full stub rollback.

---

## 8. Definition of Done

- [x] `SearchDiscoveryEnricher`, `DiscoveryIntersection`, `SearchCandidateMapper`
- [x] `SearchResultMapper` enriched path + metadata
- [x] Both flags gate enrichment; safe fallback on failure
- [x] Correlation ID in metadata
- [x] Pipeline telemetry (`discoveryMs`, `filterMs`)
- [x] No Discovery / Firestore / Marketplace / UI changes
- [x] Mock DiscoverySDK tests only

**Awaiting ARB approval before M4 PR-7+ or PR-10 (Marketplace search UI).**

---

## Related

- [`PR-5-SEARCH-SDK-ORCHESTRATION-REPORT.md`](./PR-5-SEARCH-SDK-ORCHESTRATION-REPORT.md)
- [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)
