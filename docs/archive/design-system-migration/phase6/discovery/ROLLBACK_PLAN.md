# Phase 6 — Milestones 2B + 2C + 2D: Rollback Plan

**Agent:** 2 — Discovery Migration  
**Date:** 2026-07-10

## When to rollback

### 2B (Listing)
- Visual regression on listing cards blocks release
- Favorite or navigation regression on restaurant cards
- Pagination/load-more failure in `DiscoveryCollectionRail`

### 2C (Search)
- Search autocomplete or filter regression blocks release
- Keyboard navigation failure on `/search`
- Result navigation or analytics event regression

### 2D (UX States)
- Error/empty/offline state regression blocks release
- Retry button failure on discovery or search surfaces
- Load-more error UI causes pagination regression

## Steps (< 35 minutes)

### 2D UX states rollback

1. **Restore state handling** from git for:
   - `orderbhojan/src/features/discovery/ui/DiscoveryHomeFeed.tsx`
   - `orderbhojan/src/features/discovery/ui/DiscoveryCollectionRail.tsx`
   - `orderbhojan/src/features/experience/ui/home/HomeSpotlightMockFeed.tsx`
   - `orderbhojan/src/features/experience/ui/home/FeaturedRestaurantsSection.tsx`
   - `orderbhojan/src/features/experience/ui/home/TrendingFoodsSection.tsx`
   - `orderbhojan/src/presentation/search/OrderBhojanSearchExperience.tsx`
   - `orderbhojan/src/presentation/search/OrderBhojanSearchResultsSkeleton.tsx`
   - `orderbhojan/src/features/experience/ui/shared/ExperienceEmptyStates.tsx`
   - `orderbhojan/src/presentation/discovery/OrderBhojanDiscoveryStatePanel.tsx`

2. **Remove presentation states layer**:
   - `orderbhojan/src/presentation/states/` (entire directory)

3. **Verify**
   ```bash
   cd orderbhojan && npm run build
   node --import tsx --test tests/m3-discovery.test.ts tests/m4-search.test.ts
   ```

### 2C search rollback

1. **Restore search UI components** from git for:
   - `orderbhojan/src/features/search/ui/SearchExperience.tsx`
   - `orderbhojan/src/features/search/ui/SearchFiltersBar.tsx`
   - `orderbhojan/src/features/search/ui/SearchResultsSection.tsx`
   - `orderbhojan/src/features/search/ui/SearchResultRow.tsx`
   - `orderbhojan/src/features/search/ui/SearchBrowsePanel.tsx`
   - `orderbhojan/src/features/experience/ui/search/MockSearchExperiencePage.tsx`

2. **Remove presentation search layer** (optional if full rollback):
   - `orderbhojan/src/presentation/search/` (entire directory)
   - Revert test updates in `tests/m15-experience.test.ts`, `tests/m65-premium-evolution.test.ts`, `tests/px2-design-implementation.test.ts`

3. **Verify**
   ```bash
   cd orderbhojan && npm run build
   node --import tsx --test tests/m4-search.test.ts
   ```

### 2B listing rollback

1. **Restore listing components** from git for:
   - `orderbhojan/src/features/discovery/ui/DiscoveryRestaurantCard.tsx`
   - `orderbhojan/src/features/discovery/ui/DiscoveryCollectionRail.tsx`
   - `orderbhojan/src/features/experience/ui/home/KitchenSpotlightCard.tsx`
   - `orderbhojan/src/features/experience/ui/home/FeaturedRestaurantsSection.tsx`
   - `orderbhojan/src/features/experience/ui/home/HomeKitchenSpotlightMock.tsx`
   - `orderbhojan/src/features/experience/ui/home/HomeRestaurantPoster.tsx`

2. **Remove presentation listing layer** (optional if full rollback):
   - `orderbhojan/src/presentation/discovery/OrderBhojanKitchenCard.tsx`
   - `orderbhojan/src/presentation/discovery/OrderBhojanMockKitchenCard.tsx`
   - `orderbhojan/src/presentation/discovery/mapRestaurantToKitchenCard.ts`
   - Revert exports in `orderbhojan/src/presentation/discovery/index.ts`

3. **Revert design-system card** if Founder marketplace affected:
   - `src/design-system/marketplace/MarketplaceKitchenCard.tsx`
   - `src/lib/marketplace/types.ts` badge union extension

4. **Verify**
   ```bash
   cd orderbhojan && npm run build
   cd .. && npm run build:web
   ```

## What rollback does NOT affect

- Milestone 2A home hero (independent)
- Agent 1 shell migration
- Discovery engine, search engine, APIs, hooks, stores
- Database / Firestore

## Partial rollback

- **Keep 2A–2C, revert 2D only:** restore 2D files without touching `presentation/discovery` or `presentation/search` card/bar modules
- **Keep 2A + 2B, revert 2C only:** restore search files in 2C step 1 without touching `presentation/discovery`
- **Keep 2A home but revert listing only:** restore 2B files without touching `HomeExperiencePage` or `presentation/discovery` home modules
