# M4 PR-8 — Advanced Search Filters & Search Analytics Report

**PR:** BHOS-M4-PR8  
**Date:** 2026-06-26  
**Status:** ✅ Complete — filters, sort, analytics, no SDK changes

---

## 1. UI Architecture

```
MarketplaceHome
├── MarketplaceSearchBar
├── MarketplaceSearchFilterChips (Open Now, Veg Only, More)
├── MarketplaceSearchSortSelector
├── MarketplaceSearchFilterDrawer (distance, rating, delivery time)
└── MarketplaceSearchResults → MarketplaceSearchResultCard
```

All business logic in `src/lib/marketplace/` — components render view models only.

---

## 2. Filter Flow

1. User toggles chips or opens drawer → `useMarketplaceSearch.updateFilters()`
2. `applyMarketplaceSearchFilters()` persists to `sessionStorage`
3. `buildMarketplaceSearchFacadeQuery()` maps to existing `SearchFacadeQuery` fields
4. `SearchFacade` → `SearchSDK` applies facets (openNow, rating, distance, ETA)
5. Presentation `sortMarketplaceSearchResults()` applies sort without SDK ranking changes

| Filter | Facade field | SDK behaviour |
|--------|--------------|---------------|
| Open Now | `openNow` | Discovery + facet filter |
| Veg Only | `vegOnly` | Passed through (menu data deferred) |
| Max distance | `maxDistanceKm` | Facet filter |
| Min rating | `minRating` | Facet filter |
| Max delivery | `maxDeliveryMins` | Facet filter |

---

## 3. Search Analytics Design

**Module:** `searchAnalytics.ts`

| Event | When |
|-------|------|
| `SEARCH_STARTED` | Search invoked |
| `SEARCH_COMPLETED` | Results returned |
| `SEARCH_FILTER_APPLIED` | Filters/sort changed |
| `SEARCH_RESULT_CLICKED` | Result card clicked |
| `SEARCH_CLEARED` | Search reset |
| `SEARCH_RETRY` | Retry invoked |
| `SEARCH_NO_RESULTS` | Empty result set |

Events buffered in-memory (tests) + `TelemetryService.logInfo` with `context: MarketplaceSearchAnalytics`.

---

## 4. Session Management

| Data | Storage |
|------|---------|
| Recent searches | `sessionStorage` (`recentSearchSession.ts`) |
| Filters + sort | `sessionStorage` (`searchFilterSession.ts`) |
| Search session | In-memory `SearchSession` |

Clear search resets query session; filters persist until user resets drawer.

---

## 5. Telemetry

- Search facade timing unchanged (no SDK modifications)
- Analytics payload includes `correlationId`, `query`, `filters`, `sort`, `resultCount`
- Result header still shows correlation ref from PR-7

---

## 6. Testing

**File:** `src/lib/__tests__/marketplaceSearchFilters.test.ts` (11 cases)

| Case | Status |
|------|--------|
| Facade query mapping | ✅ |
| Sort distance / rating / recommended | ✅ |
| Filter persistence | ✅ |
| Active filter count | ✅ |
| Analytics buffer | ✅ |
| Filter combinations + analytics | ✅ |
| Apply filters re-search | ✅ |
| Empty results analytics | ✅ |
| Search cleared analytics | ✅ |

Run: `npm run test:sdk`

---

## 7. Risk Assessment

| Risk | Mitigation |
|------|------------|
| Presentation sort vs discovery rank | Recommended preserves SDK order; explicit sorts documented |
| Veg filter without menu data | Passed to facade; full filtering when menu index lands |
| Analytics noise | Ring buffer cap + TelemetryService dedup |
| Filter/session drift | Single `searchFilterSession` source of truth |

---

## 8. Rollback

Remove filter UI components and `searchFilterSession` / `searchAnalytics` modules. Search reverts to PR-7 behaviour.

---

## 9. Definition of Done

- [x] Open Now, Veg Only, distance, rating, delivery time filters
- [x] Sort: Recommended, Distance, Rating
- [x] Filter chips, drawer, sort selector
- [x] Session persistence for filters/sort
- [x] All 7 analytics events
- [x] No SearchSDK / Discovery / repository / ranking changes
- [x] Feature flags respected
- [x] Tests for filters, sort, persistence, analytics

**Awaiting ARB approval before autocomplete/suggestions (M4 PR-9).**

---

## Related

- [`PR-7-MARKETPLACE-SEARCH-EXPERIENCE-REPORT.md`](./PR-7-MARKETPLACE-SEARCH-EXPERIENCE-REPORT.md)
- [`PR-6-SEARCH-DISCOVERY-PIPELINE-REPORT.md`](./PR-6-SEARCH-DISCOVERY-PIPELINE-REPORT.md)
