# M4 PR-7 — Marketplace Search Experience Report

**PR:** BHOS-M4-PR7  
**Date:** 2026-06-26  
**Status:** ✅ Complete — marketplace search UI, no SDK changes

---

## 1. UI Architecture

```
MarketplaceHome.tsx
      ↓
useMarketplaceSearch (hook)
      ↓
MarketplaceSearchFacade
      ↓
SearchFacade → SearchSDK → DiscoverySDK
      ↓
mapSearchToMarketplace → view models
      ↓
React components (SearchResult cards only)
```

No Firestore, SearchSDK, or DiscoverySDK imports in React components.

---

## 2. Component Tree

```
MarketplaceHome
├── MarketplaceSearchBar (input, clear, recent searches)
├── MarketplaceSearchResults
│   ├── MarketplaceSearchStates (loading / empty / error / location)
│   └── MarketplaceSearchResultCardView × N
│       └── HighlightedText
└── MarketplaceHomeStates + MarketplaceKitchenCardView (browse mode)
```

---

## 3. Facade Integration

| Module | Role |
|--------|------|
| `MarketplaceSearchFacade.ts` | SearchFacade orchestration + view model |
| `mapSearchToMarketplace.ts` | `SearchResult` → cards + match badges |
| `searchHighlight.ts` | Query token highlighting |
| `recentSearchSession.ts` | Session-only recent searches |
| `searchTypes.ts` | Presentation view models |

Feature gates: `FF_SEARCH_ENABLED` + `FF_DISCOVERY_ENABLED` + `FF_DISCOVERY_MARKETPLACE_ENABLED`.

---

## 4. Session Flow

1. User submits search bar → `searchMarketplaceHome(text)`
2. `SearchFacade.searchRestaurants()` updates `SearchSession`
3. Hook subscribes via `subscribeMarketplaceSearch`
4. Successful text queries stored in `sessionStorage` recent list
5. Clear search → `clearMarketplaceSearch()` + browse mode restore

---

## 5. Loading / Error States

| State | UI |
|-------|-----|
| `loading` | Spinner — "Searching nearby restaurants…" |
| `empty` | No matches for query |
| `error` | Search failed + retry |
| `location_required` | GPS + manual address form |
| `location_denied` / `location_unavailable` | Location retry paths |
| `disabled` | Search unavailable (flags off) |

---

## 6. Telemetry

- `correlationId` from `SearchResult.metadata` shown in results header
- Facade exposes `getMarketplaceSearchTelemetrySnapshot()` for diagnostics
- Search facade timing unchanged (no SDK modifications)

---

## 7. Testing

**File:** `src/lib/__tests__/marketplaceSearchFacade.test.ts` (12 cases)

| Case | Status |
|------|--------|
| Match badge mapping | ✅ |
| Highlight segments | ✅ |
| Search success | ✅ |
| Empty query | ✅ |
| Location unavailable | ✅ |
| Empty results | ✅ |
| Discovery/search unavailable | ✅ |
| Retry | ✅ |
| Search reset | ✅ |
| Feature flags | ✅ |
| Recent searches | ✅ |

Run: `npm run test:sdk`

---

## 8. Risk Assessment

| Risk | Mitigation |
|------|------------|
| UI bypasses SearchFacade | Lint guard + facade-only imports |
| Search shown when flags off | `isMarketplaceSearchEnabled()` gate |
| Recent search privacy | `sessionStorage` only, cleared per tab |
| Browse/search mode confusion | `isSearchMode` toggles dedicated results panel |

---

## 9. Rollback

Set `FF_SEARCH_ENABLED=false` — search bar hidden; browse mode unchanged. Remove marketplace search components for full revert.

---

## 10. Definition of Done

- [x] Search bar, results, recent searches, clear, loading, empty, error, retry
- [x] Manual location retry for search
- [x] Match highlighting + explainable badges
- [x] Restaurant name, cuisine, distance, ETA, rating, eligibility
- [x] No SearchSDK / DiscoverySDK / repository / pipeline changes
- [x] No autocomplete, suggestions, or AI
- [x] Facade + hook tests

**Awaiting ARB approval before autocomplete/suggestions (M4 PR-9) or further marketplace features.**

---

## Related

- [`PR-6-SEARCH-DISCOVERY-PIPELINE-REPORT.md`](./PR-6-SEARCH-DISCOVERY-PIPELINE-REPORT.md)
- [`../m3/PR-8-MARKETPLACE-HOME-REPORT.md`](../m3/PR-8-MARKETPLACE-HOME-REPORT.md)
