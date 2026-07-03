# Search Performance Report v1.0

**Status:** Design targets + instrumentation — M4 PR-10  
**Date:** 2026-06-26  
**Note:** No production load benchmarks recorded; targets are certification baselines for staging validation.

---

## 1. Instrumentation (implemented)

### SDK layer — `SearchMetadata.timingMs`

| Field | Stage | Source |
|-------|-------|--------|
| `normalizeMs` | Query validation / normalization | `DefaultSearchAdapter` |
| `repositoryMs` | SearchRepository reads | Orchestrator timer |
| `discoveryMs` | DiscoverySDK enrichment | `SearchDiscoveryEnricher` |
| `filterMs` | Post-discovery facet filter | Enricher |
| `totalMs` | End-to-end adapter | Pipeline timer |

Recorded on every successful `SearchResult` when flags enabled.

### Presentation layer — `SearchTelemetry`

| Field | Meaning |
|-------|---------|
| `contextMs` | `buildSearchContext` duration |
| `sdkMs` | SearchSDK call duration |
| `totalMs` | Facade attempt wall time |
| `attemptId` | Per-search correlation |

Accessible via `getSearchTelemetrySnapshot()` / `getMarketplaceSearchTelemetrySnapshot()`.

### UI layer

| Control | Value |
|---------|-------|
| Autocomplete debounce | 300ms (`useMarketplaceAutocomplete`) |
| Min autocomplete prefix | 2 characters |
| Default autocomplete limit | 8 suggestions |
| Default suggest limit | 12 suggestions |

---

## 2. Latency targets (v1.0 design)

| Operation | Target (p95) | Staging accept (p95) | Risk if exceeded |
|-----------|--------------|----------------------|------------------|
| Facade context build | < 10ms | < 25ms | Low — local only |
| Repository scan (≤100 tenants) | < 200ms | < 500ms | Medium — dev dataset |
| Repository scan (production scale) | N/A v1 | Monitor | **High** — index ADR required |
| Discovery enrichment | < 400ms | < 800ms | Medium — shared with browse |
| Full search (end-to-end) | < 600ms | < 1200ms | User-perceived delay |
| Autocomplete (post-debounce) | < 300ms | < 600ms | Typing responsiveness |
| Suggest panel (focus) | < 400ms | < 800ms | First paint |

---

## 3. Known performance constraints

| Constraint | Impact | v1.0 mitigation |
|------------|--------|-----------------|
| Firestore full collection scan | O(n) tenants | `FF_SEARCH_REPOSITORY_ENABLED` OFF by default |
| No dedicated search index | Prefix scan in memory | Limit hits (default 8–12) |
| Discovery double-call on search | Adds discovery latency | Shared DiscoverySDK instance; timing tracked |
| Client-side debounce | 300ms perceived delay | Prevents request storms |

---

## 4. Scalability path (post-v1)

| Phase | Approach | ADR required |
|-------|----------|--------------|
| v1.0 | In-memory scan via `FirestoreScanSearchProvider` | No |
| v1.1+ | Denormalized `searchIndex/{tenantId}` | Yes |
| v2+ | Geo-partitioned index + prefix trie | Yes |

---

## 5. Staging validation procedure

1. Enable `FF_SEARCH_*` + `FF_DISCOVERY_*` in preview.
2. Collect `timingMs` from 50+ searches across 3 geo locations.
3. Record p50/p95 for `totalMs`, `repositoryMs`, `discoveryMs`.
4. Compare against staging accept column above.
5. File deviation ADR if repository p95 > 500ms on staging dataset.

---

## 6. Performance certification

| Criterion | v1.0 status |
|-----------|-------------|
| Timing instrumentation present | ✅ |
| UI debounce / limits | ✅ |
| Production benchmarks | ⏳ Pending staging |
| Load test | ⏳ Not in scope PR-10 |

**Performance sign-off:** Conditional — instrumentation certified; production SLOs pending soak.
