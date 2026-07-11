# Phase 6 — Milestone 2C: Search Experience Migration Report

**Agent:** 2 — Discovery Migration  
**Status:** ✅ COMPLETE — validation gate passed  
**Date:** 2026-07-10  
**Prerequisite:** Milestone 2B PASS, Chief Architect 2C APPROVED

---

## Executive summary

The complete OrderBhojan **search presentation** (`/search` and mock search surface) now renders through Founder `src/design-system` marketplace primitives. Search behaviour — debouncing, React Query caching, filter state, history, analytics, keyboard navigation, and result ranking — is unchanged. Legacy search UI files remain as thin re-export shims for rollback until Phase 7.

---

## Scope completed

| Surface | Status |
|---------|--------|
| Live search experience (`SearchExperience` → `OrderBhojanSearchExperience`) | ✅ |
| Search bar + autocomplete dropdown | ✅ |
| Filter chips bar (cuisine, distance, rating, veg, open now, …) | ✅ |
| Sectioned search results (restaurant + non-restaurant rows) | ✅ |
| Browse / zero-state panel (recent, popular, trending) | ✅ |
| Loading skeletons, empty states, error states | ✅ |
| Mock search page (feature-flag off) | ✅ |

---

## Architecture

```
useSearchResults / useSearchSuggestions / useSearchBrowse (unchanged hooks)
        ↓
searchStore (session, history, filters — unchanged)
        ↓
presentation/search/* (new presentation wires)
        ↓
MarketplaceSearchBar | MarketplaceSearchAutocomplete
MarketplaceSearchResultCardView | OrderBhojanKitchenCard (2B)
Section | SectionHeader | SoftButton | SkeletonSystem
```

**Not swapped:** `MarketplaceSearchResults` wholesale view model — OrderBhojan uses sectioned `SearchPlatformResponse`. Presentation maps OB DTOs to individual DS primitives to preserve business logic.

---

## OrderBhojan changes

### New (`orderbhojan/src/presentation/search/`)

| File | Role |
|------|------|
| `OrderBhojanSearchExperience.tsx` | Page shell, state routing (browse vs results) |
| `OrderBhojanSearchBar.tsx` | `MarketplaceSearchBar` + `MarketplaceSearchAutocomplete`, keyboard nav |
| `OrderBhojanSearchFiltersBar.tsx` | Founder chip styling, `useSearchFilterStore` unchanged |
| `OrderBhojanSearchBrowsePanel.tsx` | Zero-state browse sections |
| `OrderBhojanSearchResultsSection.tsx` | Sectioned results layout |
| `OrderBhojanSearchResultRow.tsx` | Restaurant → `OrderBhojanKitchenCard`; other → result card VM |
| `OrderBhojanSearchResultsSkeleton.tsx` | `RecommendedSkeleton` / browse skeleton |
| `mapSearchSuggestionsToAutocompleteView.ts` | Suggestion DTO → autocomplete VM |
| `mapSearchItemToResultCard.ts` | Non-restaurant item → result card VM |

### Shims (legacy paths preserved)

- `features/search/ui/SearchExperience.tsx` → re-exports `OrderBhojanSearchExperience`
- `SearchResultRow.tsx`, `SearchFiltersBar.tsx`, `SearchResultsSection.tsx`, `SearchBrowsePanel.tsx` → re-export presentation components

### Migrated

- `features/experience/ui/search/MockSearchExperiencePage.tsx` → Founder DS layout

### Design-system

- `src/design-system/marketplace/types.ts` — search/autocomplete type exports (no logic change)

---

## Business logic verification

| System | Modified? |
|--------|-----------|
| `searchPlatform` / `executeSearch` | ❌ No |
| `searchApiClient` / MSW handlers | ❌ No |
| `useSearchResults` / React Query | ❌ No |
| `useSearchSuggestions` / debounce | ❌ No |
| `useSearchBrowse` | ❌ No |
| `useSearchFilterStore` | ❌ No |
| `useSearchHistoryStore` / `useSearchSessionStore` | ❌ No |
| `searchAnalytics` | ❌ No (events wired from presentation) |
| `SearchPlatformResponse` DTO / ranking | ❌ No |
| Routing / `SearchExperiencePage` gate | ❌ No |
| Firestore | ❌ No |

---

## Behaviour preservation

| Behaviour | Preserved via |
|-----------|---------------|
| Debouncing | `useDebouncedValue` in `useSearchSuggestions` |
| Autocomplete suggestions | `mapSearchSuggestionsToAutocompleteView` + `OrderBhojanSearchBar` |
| Arrow keys / Enter / Escape | `OrderBhojanSearchBar` key handlers |
| Recent searches / history | `useSearchHistoryStore` |
| Filter chips (cuisine, veg, rating, …) | `OrderBhojanSearchFiltersBar` + `useSearchFilterStore` |
| Sectioned results | `OrderBhojanSearchResultsSection` |
| Restaurant navigation | `OrderBhojanKitchenCard` Link |
| Non-restaurant term selection | `onSelectTerm` callback |
| Query highlight in results | `HighlightedText` via result card VM |
| Analytics events | `trackSearchEvent` from presentation wires |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` (orderbhojan) | ✅ PASS |
| `validate-architecture.mjs` | ✅ PASS |
| `tests/m4-search.test.ts` | ✅ PASS (17/17) |
| `tests/px2-design-implementation.test.ts` | ✅ PASS (11/11) |
| `tests/m15-experience.test.ts` | ✅ PASS (updated mock search assertion) |
| `tests/m65-premium-evolution.test.ts` | ✅ PASS (updated home hero assertion) |
| `npm run lint` | ⚠️ 4 pre-existing location UI errors — see [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) |

---

## Related deliverables

| Document | Purpose |
|----------|---------|
| [SEARCH_COMPONENT_MAPPING.md](./SEARCH_COMPONENT_MAPPING.md) | Component mapping table |
| [SEARCH_VISUAL_REGRESSION.md](./SEARCH_VISUAL_REGRESSION.md) | Visual comparison |
| [SEARCH_PERFORMANCE_REPORT.md](./SEARCH_PERFORMANCE_REPORT.md) | Bundle analysis |
| [ACCESSIBILITY_REPORT.md](./ACCESSIBILITY_REPORT.md) | A11y verification |
| [ROLLBACK_PLAN.md](./ROLLBACK_PLAN.md) | Rollback procedure (2B + 2C) |
| [TECHNICAL_DEBT.md](./TECHNICAL_DEBT.md) | Lint + known issues |
| [../baselines/](../baselines/) | Visual & functional regression baselines |

---

## Stop condition

**Milestone 2C complete.**

Per Chief Architect execution model:

**STOP — do not begin Milestone 2D (UX States), Menu, Checkout, Orders, Profile, Authentication, Favorites, or Notifications.**

Await approval before next milestone.
