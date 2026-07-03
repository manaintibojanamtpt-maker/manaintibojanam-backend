# Search Observability v1.0

**Status:** Documented — M4 PR-10  
**Date:** 2026-06-26

---

## 1. Observability layers

```
User action
    │
    ├── SearchAnalytics (presentation) ──► TelemetryService (lazy)
    │
    ├── SearchTelemetry (facade in-memory)
    │
    └── SearchMetadata (SDK result)
            ├── timingMs
            ├── correlationId
            ├── flags
            └── searchSdkVersion
```

---

## 2. Analytics events

**Module:** `src/lib/marketplace/searchAnalytics.ts`  
**Buffer:** In-memory ring (max 100 events) — `getSearchAnalyticsBuffer()`

| Event | Trigger | Key payload fields |
|-------|---------|-------------------|
| `SEARCH_STARTED` | Search invoked | `query`, `correlationId` |
| `SEARCH_COMPLETED` | Results returned | `query`, `resultCount` |
| `SEARCH_FILTER_APPLIED` | Filter/sort change | `filters`, `sort` |
| `SEARCH_RESULT_CLICKED` | Card click | `tenantId`, `query` |
| `SEARCH_CLEARED` | Clear search | `query` |
| `SEARCH_RETRY` | Retry action | `query` |
| `SEARCH_NO_RESULTS` | Empty result set | `query` |
| `SEARCH_AUTOCOMPLETE_OPENED` | Panel opens | `prefix` |
| `SEARCH_AUTOCOMPLETE_SELECTED` | Autocomplete pick | `label`, `kind`, `prefix` |
| `SEARCH_SUGGESTION_CLICKED` | Suggestion pick | `label`, `source`, `prefix` |
| `SEARCH_RECENT_SELECTED` | Recent pick | `query`, `prefix` |
| `SEARCH_POPULAR_SELECTED` | Popular cuisine pick | `label`, `prefix` |

**Telemetry export:** `TelemetryService.logInfo('SearchAnalytics:{type}', payload)` — dynamic import; failures swallowed.

---

## 3. Facade telemetry

**Module:** `src/lib/search/SearchTelemetry.ts`

| Function | Purpose |
|----------|---------|
| `beginSearchTelemetry(attemptId)` | Start attempt |
| `recordSearchContextTiming(ms)` | Context build timing |
| `completeSearchTelemetry(status, sdkMs?)` | Finalize with status |
| `getSearchTelemetrySnapshot()` | Read current snapshot |

**Statuses:** `loading`, `success`, `empty`, `error`, `retry`, `cancelled`, `disabled`

---

## 4. SDK pipeline telemetry

**Module:** `src/sdk/search/pipeline/searchPipelineTelemetry.ts`

Timers use `performance.now()` when available.

**Embedded in results:**

```typescript
SearchResult.metadata.timingMs: {
  normalizeMs?, repositoryMs?, discoveryMs?, filterMs?, totalMs?
}
SearchResult.metadata.flags: {
  searchEnabled, discoveryEnabled?, autocompleteEnabled, suggestionsEnabled
}
```

---

## 5. Correlation IDs

| Layer | ID format | Propagation |
|-------|-----------|-------------|
| Search attempt | `search-{timestamp}-{random}` | `SearchTelemetry.attemptId` |
| Discovery enrichment | `search-{timestamp}-{random}` | `SearchMetadata.correlationId` |
| Analytics | Optional `correlationId` in payload | From search view model |

**Join strategy (staging/prod):** Correlate analytics events with SDK metadata via shared `correlationId` on `SEARCH_COMPLETED` payload.

Factory injectable in tests: `SearchDiscoveryEnricherDeps.correlationIdFactory`.

---

## 6. Error observability

| Layer | Error shape | Retryable flag |
|-------|-------------|----------------|
| SDK | `SdkError.code` | Per code |
| Facade | `SearchPresentationError` | `retryable` |
| Marketplace | View model `error.userMessage` | `view.retryable` |

Mapped codes: `NOT_CONFIGURED`, `VALIDATION`, `UNAVAILABLE`, `NOT_FOUND`, `FORBIDDEN`, `RATE_LIMITED`

---

## 7. Feature flag observability

Flags echoed in `SearchResult.metadata.flags` on every search — enables runtime assertion of effective flag state without env inspection.

Presentation readers:

- `src/lib/search/searchFeatureFlags.ts`
- `src/sdk/search/core/featureFlags.ts`

---

## 8. Gaps (v1.0)

| Gap | Priority |
|-----|----------|
| No Datadog / Sentry dashboards | Medium — post-staging |
| Analytics buffer not persisted | Low — session only |
| No distributed trace IDs | Low — single-tenant web |
| Autocomplete timing not in SDK metadata | Low — UI debounce covers |

---

## 9. Recommended dashboards (post-rollout)

1. Search volume by status (success / empty / error)
2. p95 `timingMs.totalMs` and `discoveryMs`
3. `SEARCH_NO_RESULTS` rate by query length
4. Autocomplete open → select conversion
5. `NOT_CONFIGURED` / `UNAVAILABLE` error rate (rollback indicator)
