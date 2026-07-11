# Search Component Mapping — Phase 6 / Milestone 2C

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10  
**Status:** ✅ Mapping complete — implementation complete

---

## Primary search surface (`/search`)

| Current OrderBhojan Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------------------- | ---- | ---------------------- | ----------------- | ---------------- |
| `SearchExperience` (page shell) | `features/search/ui/SearchExperience.tsx` | `Section` layout on `#030303` | `OrderBhojanSearchExperience` | ✅ Complete |
| `PremiumSearch` (sticky input) | `SearchExperience.tsx` | `MarketplaceSearchBar` | `OrderBhojanSearchBar` | ✅ Complete |
| Custom suggestions listbox | `SearchExperience.tsx` (`ob-search-suggestions`) | `MarketplaceSearchAutocomplete` | `mapSearchSuggestionsToAutocompleteView` + `OrderBhojanSearchBar` | ✅ Complete |
| `SearchFiltersBar` | `features/search/ui/SearchFiltersBar.tsx` | `MarketplaceSearchFilterChips` pattern + `SoftButton` | `OrderBhojanSearchFiltersBar` | ✅ Complete |
| `SearchResultsSection` | `features/search/ui/SearchResultsSection.tsx` | `Section` + `SectionHeader` | `OrderBhojanSearchResultsSection` | ✅ Complete |
| `SearchResultRow` (restaurant) | `features/search/ui/SearchResultRow.tsx` | `MarketplaceKitchenCardView` | `OrderBhojanKitchenCard` (from 2B) | ✅ Complete |
| `SearchResultRow` (food/category/…) | `SearchResultRow.tsx` | `MarketplaceSearchResultCardView` + `HighlightedText` | `OrderBhojanSearchResultRow` | ✅ Complete |
| `SearchResultsSkeleton` | `SearchResultRow.tsx` | `SkeletonSystem` (`RecommendedSkeleton`) | `OrderBhojanSearchResultsSkeleton` | ✅ Complete |
| Search error empty state | `SearchExperience.tsx` | `SectionHeader` + `SoftButton` | `OrderBhojanSearchStatePanel` (reuse from discovery) | ✅ Complete |
| Search no-results state | `SearchExperience.tsx` | `SectionHeader` + Founder empty pattern | `OrderBhojanSearchStatePanel` | ✅ Complete |
| `SearchBrowsePanel` | `features/search/ui/SearchBrowsePanel.tsx` | `Section` + `SectionHeader` + chip row | `OrderBhojanSearchBrowsePanel` | ✅ Complete |
| Browse loading skeleton | `SearchBrowsePanel.tsx` (BDS `Skeleton`) | `CategorySkeleton` / `Skeleton` from `SkeletonSystem` | `OrderBhojanSearchBrowseSkeleton` | ✅ Complete |
| Browse empty state | `SearchBrowsePanel.tsx` (BDS `EmptyState`) | `SectionHeader` + `SoftButton` + `GlassCard` | `OrderBhojanSearchBrowsePanel` | ✅ Complete |
| Back navigation button | `SearchExperience.tsx` (BDS `Button`) | `SoftButton tone="ghost"` | inline in `OrderBhojanSearchExperience` | ✅ Complete |

---

## Mock / feature-flag off surface

| Current Component | File | Founder DS Replacement | Migration Status |
| ----------------- | ---- | ---------------------- | ---------------- |
| `MockSearchExperiencePage` | `experience/ui/search/MockSearchExperiencePage.tsx` | `Section` + `MarketplaceSearchBar` (read-only launcher) + `OrderBhojanSearchBrowsePanel` pattern | ✅ Complete |
| BDS `SearchBar` | `MockSearchExperiencePage.tsx` | `MarketplaceSearchBar` | ✅ Complete |
| BDS `Chip` browse terms | `MockSearchExperiencePage.tsx` | Founder chip buttons (`SoftButton` / styled chips) | ✅ Complete |
| `MenuSkeleton` | `MockSearchExperiencePage.tsx` | `SkeletonSystem` | ✅ Complete |

---

## Route / provider (unchanged logic)

| Component | File | Action |
| --------- | ---- | ------ |
| `SearchExperiencePage` | `experience/ui/search/SearchExperiencePage.tsx` | **No logic change** — still gates on `useSearchFeatureEnabled` |
| `SearchProvider` | `features/search/ui/SearchProvider.tsx` | **Unchanged** |
| `useSearchResults` | `hooks/useSearchResults.ts` | **Unchanged** |
| `useSearchSuggestions` | `hooks/useSearchSuggestions.ts` | **Unchanged** |
| `useSearchBrowse` | `hooks/useSearchBrowse.ts` | **Unchanged** |
| `useDebouncedValue` | `hooks/useDebouncedValue.ts` | **Unchanged** |
| `searchStore` (session/history/filters) | `store/searchStore.ts` | **Unchanged** |
| `searchPlatform` / `searchApiClient` | `engine/`, `infrastructure/` | **Unchanged** |
| `searchAnalytics` | `analytics/searchAnalytics.ts` | **Unchanged** (wired from presentation) |

---

## CSS / BDS (retain until Phase 7)

| Asset | Action |
| ----- | ------ |
| `experience-search.css` | Keep loaded; listing rules become orphaned at runtime |
| `ob-search-px2`, `ob-search-platform__body` classes | Replaced by Founder layout classes in presentation layer |
| BDS `PremiumSearch`, `MotionPage`, `Chip`, `Card`, `EmptyState` | Removed from hot path; files retained |

---

## Founder DS components used (2C)

| DS Component | Usage |
| ------------ | ----- |
| `MarketplaceSearchBar` | Primary search input + submit |
| `MarketplaceSearchAutocomplete` | Suggestions dropdown |
| `MarketplaceSearchFilterChips` | Visual reference for filter chip styling |
| `MarketplaceSearchResultCardView` | Non-restaurant result rows |
| `MarketplaceKitchenCardView` | Restaurant result rows (via `OrderBhojanKitchenCard`) |
| `HighlightedText` | Query match highlighting |
| `Section` / `SectionHeader` | Page and results sections |
| `SoftButton` | Clear, retry, back, browse chips |
| `GlassCard` | Optional compact result fallback |
| `SkeletonSystem` | Loading states |

**Not used wholesale:** `MarketplaceSearchResults` — OrderBhojan uses sectioned `SearchPlatformResponse`, not Founder `MarketplaceSearchViewModel`. Presentation wires OB hooks to individual DS primitives instead of forcing view-model swap (preserves business logic).

---

## Behaviour preservation matrix

| Behaviour | Preserved via |
| --------- | ------------- |
| Debouncing | `useDebouncedValue` in `useSearchSuggestions` (unchanged) |
| React Query caching | `useSearchResults` / `useSearchBrowse` (unchanged) |
| Filter state | `useSearchFilterStore` (unchanged) |
| Search history | `useSearchHistoryStore` (unchanged) |
| Session query/focus | `useSearchSessionStore` (unchanged) |
| Analytics events | `trackSearchEvent` from presentation wires |
| Enter submit / Escape clear | `OrderBhojanSearchBar` key handlers |
| Arrow key autocomplete | **Added in presentation** (`OrderBhojanSearchBar` — was not in BDS `PremiumSearch` flow) |
| Restaurant navigation | `OrderBhojanKitchenCard` Link |
| Non-restaurant selection | `onSelectTerm` callback preserved |

---

## Implementation order

1. `presentation/search/mapSearchSuggestionsToAutocompleteView.ts`
2. `presentation/search/mapSearchItemToResultCard.ts`
3. `presentation/search/OrderBhojanSearchBar.tsx`
4. `presentation/search/OrderBhojanSearchFiltersBar.tsx`
5. `presentation/search/OrderBhojanSearchResultsSkeleton.tsx`
6. `presentation/search/OrderBhojanSearchResultRow.tsx`
7. `presentation/search/OrderBhojanSearchResultsSection.tsx`
8. `presentation/search/OrderBhojanSearchBrowsePanel.tsx`
9. `presentation/search/OrderBhojanSearchExperience.tsx`
10. Shim: `SearchExperience.tsx` → re-export `OrderBhojanSearchExperience`
11. Migrate `MockSearchExperiencePage.tsx` presentation
12. Update `px2-design-implementation.test.ts` (PremiumSearch → MarketplaceSearchBar)

---

## Checkpoint

**Mapping complete. Implementation complete. Validation gate passed.**
