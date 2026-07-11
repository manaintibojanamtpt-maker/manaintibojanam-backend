# Phase 6 — Milestone 2C: Search Performance Report

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## Bundle comparison

| Metric | After 2B (Listing) | After 2C (Search) | Delta 2C |
|--------|-------------------|---------------------|----------|
| CSS (gzip) | 39.27 kB (252.82 kB raw) | 39.41 kB (253.55 kB raw) | +0.14 kB gzip |
| JS main chunk (gzip) | 405.71 kB (1,473.18 kB raw) | 406.95 kB (1,477.43 kB raw) | +1.24 kB gzip |
| Precache total | 2,040 KiB | 2,045 KiB | +5 KiB |
| Build time | ~22s | ~21.5s | No regression |

## Assessment

| Criterion | Result |
|-----------|--------|
| Unnecessary bundle increase | ✅ No — raw JS +0.29% |
| Tree-shaking maintained | ✅ Adapter path imports only (`@bhojan/storefront-design-system/marketplace/*`, `primitives/*`) |
| Debounce / React Query unchanged | ✅ No new query layers |
| Duplicate search components at runtime | ✅ Single DS autocomplete + search bar |
| BDS `PremiumSearch` in hot path | ✅ Removed from live search |
| Lazy loading | ✅ N/A for search input; kitchen cards preserve `loading="lazy"` |

## New modules in OrderBhojan bundle

- `OrderBhojanSearchExperience` and 8 sibling presentation modules
- `mapSearchSuggestionsToAutocompleteView` / `mapSearchItemToResultCard`
- Reused from 2B: `OrderBhojanKitchenCard`, `mapRestaurantToKitchenCard`

## Removed from hot path (files retained)

- BDS `PremiumSearch` in `SearchExperience.tsx`
- Custom `ob-search-suggestions` DOM
- BDS `Chip` / `EmptyState` / `Skeleton` in search UI
- BDS `SearchBar` in `MockSearchExperiencePage`

## Autocomplete latency

| Aspect | Assessment |
|--------|------------|
| Debounce interval | Unchanged (`useDebouncedValue` in `useSearchSuggestions`) |
| Suggestion mapping | O(n) string map in presentation — negligible vs network |
| Re-render scope | Autocomplete isolated in `OrderBhojanSearchBar` |

## Memory

No new global stores or caches introduced. Presentation components are function components with local keyboard-nav state only.

## Recommendations (Phase 7+, not implemented)

1. Code-split `presentation/search` if menu/checkout migration grows main chunk further.
2. Remove orphaned `experience-search.css` rules after CSS cleanup gate.
3. Consider lazy-loading `OrderBhojanSearchBrowsePanel` if search route cold-start matters.
