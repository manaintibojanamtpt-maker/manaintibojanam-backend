# M4 PR-4 — SearchFacade & Session Orchestration Report

**PR:** BHOS-M4-PR4  
**Date:** 2026-06-26  
**Status:** ✅ Complete — presentation facade + session, no UI

---

## 1. Facade Architecture

```
Presentation (future)
        ↓
SearchFacade.searchRestaurants()
        ↓
SearchContext.buildSearchContext()
        ↓
SearchSDK.search()          ← mock/stub until PR-6 pipeline
        ↓
SearchSession + SearchTelemetry
```

**`src/lib/search/`** — sole presentation entry for search. No Firestore, no repository direct access.

| Module | Role |
|--------|------|
| `SearchFacade.ts` | Orchestration, flag gate, SDK invoke |
| `SearchContext.ts` | `SearchFacadeQuery` → `SearchQuery` |
| `SearchSession.ts` | In-memory pub/sub session |
| `SearchErrorMapper.ts` | SDK → presentation errors |
| `SearchTelemetry.ts` | Attempt timing |
| `searchFeatureFlags.ts` | `FF_SEARCH_ENABLED` reader |
| `types.ts` | Presentation DTOs |

---

## 2. Session Lifecycle

| Status | When |
|--------|------|
| `idle` | Initial / after `resetSearchSession()` |
| `loading` | SDK call in flight |
| `success` | Results returned |
| `empty` | Zero restaurants |
| `error` | Validation or SDK failure |
| `retry` | Entering retry flow |
| `cancelled` | `cancelSearch()` during active attempt |
| `disabled` | `FF_SEARCH_ENABLED` off |

**API:** `subscribeSearchSession()`, `getSearchSessionSnapshot()`, `resetSearchSession()`, `retrySearch()`, `cancelSearch()`

---

## 3. Context Flow

1. Validate search intent (text or facets) via domain `hasSearchIntent`
2. Validate raw query + facet constraints (domain)
3. Resolve `CustomerCanonicalLocation` (session or override)
4. Normalize text + infer cuisine tags (domain `QueryNormalizer`)
5. Build `SearchQuery` for SDK with structured filters

---

## 4. Telemetry

`SearchTelemetry` records per attempt:

| Field | Description |
|-------|-------------|
| `attemptId` | Unique attempt identifier |
| `contextMs` | Context build duration |
| `sdkMs` | SDK call duration |
| `totalMs` | End-to-end facade duration |
| `status` | Final session status |

In-memory only — no external analytics in PR-4.

---

## 5. Testing

**File:** `src/lib/__tests__/searchFacade.test.ts`

| Case | Covered |
|------|---------|
| Flag OFF → disabled | ✅ |
| Empty query validation | ✅ |
| Missing location | ✅ |
| Context mapping | ✅ |
| Empty results → `empty` status | ✅ |
| Success results | ✅ |
| NOT_CONFIGURED error | ✅ |
| Retry + retry count | ✅ |
| Session subscribe | ✅ |
| Session reset | ✅ |
| Cancel during loading | ✅ |
| Telemetry snapshot | ✅ |

Mock SDK only — no live Firebase.

Run: `npm run test:sdk`

---

## 6. Risk Assessment

| Risk | Mitigation |
|------|------------|
| UI bypasses facade | ADR-011 — document sole entry point |
| Stub SDK in production | `FF_SEARCH_ENABLED` default OFF |
| Cancel race with late SDK response | Cancelled status preserved; late results ignored for session |
| Duplicate session with discovery | Separate `SearchSession` namespace |

---

## 7. Rollback

Delete `src/lib/search/` and remove test from `package.json`. Flag OFF → zero behaviour change.

---

## 8. Definition of Done

- [x] `SearchFacade`, `SearchContext`, `SearchSession`, `SearchErrorMapper`, `SearchTelemetry`, `searchFeatureFlags`, `types`
- [x] Session states: idle, loading, success, empty, error, retry, cancelled, disabled
- [x] `subscribe`, `reset`, `retry`, telemetry
- [x] `FF_SEARCH_ENABLED` gates facade (default OFF)
- [x] Mock SDK tests only
- [x] No Firestore, React, Marketplace UI, Discovery changes, ranking, autocomplete, suggestions

**Awaiting approval before M4 PR-5/PR-6 (pipeline) or Marketplace search UI (PR-10).**

---

## Related

- [`PR-3-SEARCH-REPOSITORY-REPORT.md`](./PR-3-SEARCH-REPOSITORY-REPORT.md)
- [`SEARCH-INTELLIGENCE-PLATFORM.md`](./SEARCH-INTELLIGENCE-PLATFORM.md)
