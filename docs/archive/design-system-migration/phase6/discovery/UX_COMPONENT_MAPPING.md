# UX Component Mapping — Phase 6 / Milestone 2D

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10  
**Status:** ✅ Mapping complete — implementation complete

---

## Home — live discovery

| Current Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Home feed loading | `DiscoveryHomeFeed.tsx` | `OrderBhojanHomeFeedSkeleton` → `SkeletonSystem` | Existing (2A) | ✅ Complete |
| Home feed error + retry | `DiscoveryHomeFeed.tsx` | Founder error pattern + `SoftButton` | `OrderBhojanDiscoveryUxState` `error` | ✅ Complete |
| No kitchens empty | `DiscoveryHomeFeed.tsx` | Founder empty pattern + `GlassCard` | `OrderBhojanDiscoveryUxState` `no-restaurants` | ✅ Complete |
| Location CTA secondary | `DiscoveryHomeFeed.tsx` | `SoftButton tone="ghost"` | Preserved on UX state | ✅ Complete |
| Offline banner | — (missing) | `GlassCard` + error pattern | `OrderBhojanDiscoveryOfflineNotice` | ✅ Complete |

---

## Home — mock feed (discovery OFF)

| Current Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Mock feed loading | `HomeSpotlightMockFeed.tsx` | `OrderBhojanHomeFeedSkeleton` | Existing | ✅ Complete |
| Mock feed error | `HomeSpotlightMockFeed.tsx` (`return null`) | Founder error pattern | `OrderBhojanDiscoveryUxState` `error` | ✅ Complete |
| Mock feed empty | `HomeSpotlightMockFeed.tsx` (`return null`) | Founder empty pattern | `OrderBhojanDiscoveryUxState` `no-restaurants` | ✅ Complete |
| Featured section error | `FeaturedRestaurantsSection.tsx` (`return null`) | Founder error pattern | `OrderBhojanDiscoveryUxState` `error` | ✅ Complete |
| Trending dishes loading | `TrendingFoodsSection.tsx` | BDS `MenuSkeleton` | `TrendingSkeleton` from `SkeletonSystem` | ✅ Complete |
| Trending dishes error/empty | `TrendingFoodsSection.tsx` (none) | Founder empty pattern | `OrderBhojanDiscoveryUxState` `empty` | ✅ Complete |

---

## Listing — collection rails

| Current Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Load-more loading | `DiscoveryCollectionRail.tsx` | `SoftButton` disabled text | Preserved | ✅ Complete |
| Load-more error | `DiscoveryCollectionRail.tsx` (silent) | Founder error inline | `OrderBhojanDiscoveryUxState` `load-more-error` | ✅ Complete |
| Empty rail | `DiscoveryCollectionRail.tsx` (`return null`) | Silent (no restaurants in collection) | Preserved — intentional | ✅ Complete |

---

## Search — results & browse

| Current Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| ----------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Results loading | `OrderBhojanSearchResultsSkeleton.tsx` | `RecommendedSkeleton` | Existing (2C) | ✅ Complete |
| Browse loading | `OrderBhojanSearchBrowseSkeleton` | Raw `shimmer` divs | `CategorySkeleton` + `Skeleton` | ✅ Complete |
| Results error + retry | `OrderBhojanSearchExperience.tsx` | `OrderBhojanDiscoveryStatePanel` | `OrderBhojanDiscoveryUxState` `error` | ✅ Complete |
| No results | `OrderBhojanSearchExperience.tsx` | `OrderBhojanDiscoveryStatePanel` | `OrderBhojanDiscoveryUxState` `no-results` | ✅ Complete |
| Browse error | `OrderBhojanSearchExperience.tsx` (missing) | Founder error pattern | `OrderBhojanDiscoveryUxState` `error` | ✅ Complete |
| Browse empty | `OrderBhojanSearchBrowsePanel.tsx` | `GlassCard` + `SectionHeader` | Existing (2C) | ✅ Complete |
| Autocomplete loading/error/empty | `MarketplaceSearchAutocomplete` | DS primitive | Existing (2C) | ✅ Complete |
| Offline banner | — (missing) | `OrderBhojanDiscoveryOfflineNotice` | New presentation hook | ✅ Complete |

---

## Shared state panel (2A/2C legacy)

| Current Component | File | Action |
| ----------------- | ---- | ------ |
| `OrderBhojanDiscoveryStatePanel` | `presentation/discovery/` | Refactor → delegates to `OrderBhojanDiscoveryUxState` |
| `ExperienceEmptyStates.tsx` | BDS `EmptyState` / `ErrorState` | Shim → re-export `OrderBhojanDiscoveryUxState` presets |
| `ExperienceOfflineState` | BDS `ErrorState` | Shim → `OrderBhojanDiscoveryOfflineNotice` |
| `ExperienceSkeletons.tsx` | BDS `Skeleton` rails | Shim for non-discovery; discovery uses `SkeletonSystem` |

---

## Founder DS components used (2D)

| DS Component | Usage |
| ------------ | ----- |
| `SkeletonSystem` | All discovery loading skeletons |
| `HomeBentoSkeleton`, `TrendingSkeleton`, `RecommendedSkeleton`, `CategorySkeleton` | Home, search, trending |
| `GlassCard` | Empty states, offline notice |
| `Section` / `SectionHeader` | State section framing |
| `SoftButton` | Retry, clear, secondary actions |
| `MarketplaceHomeStates` | Reference pattern for location/error/empty (adapted in presentation) |
| `MarketplaceSearchStates` | Reference pattern for search-specific states |

---

## Behaviour preservation matrix

| Behaviour | Preserved via |
| --------- | ------------- |
| React Query retry policy | Unchanged hooks (`retry: 1–2`) |
| Refetch on retry button | Same `query.refetch()` callbacks |
| Filter reset on empty | Same `resetFilters()` in DiscoveryHomeFeed |
| Location sheet open | Same `navigate('/?openLocation=1')` |
| Search clear on no-results | Same `setQuery('')` |
| Load-more pagination logic | Same `loadDiscoveryCollection` call |
| Analytics | Unchanged — no new events |

---

## Implementation order

1. `presentation/states/OrderBhojanDiscoveryUxState.tsx`
2. `presentation/states/OrderBhojanDiscoveryOfflineNotice.tsx`
3. `presentation/states/useOnlineStatus.ts`
4. Refactor `OrderBhojanDiscoveryStatePanel` → delegate to UX state
5. Wire `DiscoveryHomeFeed`, mock feeds, search experience
6. Migrate `TrendingFoodsSection` skeleton
7. Fix `OrderBhojanSearchBrowseSkeleton` → `SkeletonSystem`
8. Add `DiscoveryCollectionRail` load-more error UI
9. Shim `ExperienceEmptyStates.tsx`
10. Update tests + deliverables

---

## Checkpoint

**Mapping complete. Implementation complete. Discovery migration complete.**
