# Phase 6 — Milestone 2A: Home Migration Report

**Agent:** 2 — Discovery Migration (Milestone 2A only)  
**Status:** ✅ COMPLETE — validation gate passed  
**Date:** 2026-07-10  
**Prerequisite:** Agent 1 Shell migration PASS

---

## Scope (2A only)

| Area | Migrated |
|------|----------|
| Home page layout | ✅ |
| Hero (replaces `KitchenDoorHero` at runtime) | ✅ |
| Category rail presentation | ✅ |
| Trust strip presentation | ✅ |
| Home feed loading skeletons | ✅ |
| Discovery feed loading / empty / error UI on home | ✅ |
| Founder typography, spacing, colors (`#030303`, `#FF7A00`) | ✅ |

| Deferred to later milestones | Milestone |
|-------------------------------|-----------|
| `DiscoveryRestaurantCard` / kitchen cards | 2B |
| `DiscoveryCollectionRail` card layout | 2B |
| `DiscoveryFiltersBar` (BDS chips) | 2C |
| Full search page | 2C |
| Dedicated UX state audit | 2D |

---

## Architecture

```
OrderBhojan hooks & stores (unchanged)
  useKitchenHeroMotion, useHeroPreload, useCategoryStore
  useDiscoveryHome, useDiscoveryFeatureEnabled, LocationChip
        ↓
orderbhojan/src/presentation/discovery/
  OrderBhojanHomeHero
  OrderBhojanHomeLocationBar
  OrderBhojanHomeCategories
  OrderBhojanHomeTrustStrip
  OrderBhojanHomeFeedSkeleton
  OrderBhojanDiscoveryStatePanel
        ↓
src/design-system/
  adapters/marketplace/MarketplaceDiscoveryHeroView
  marketplace/MarketplaceSearchBar
  marketplace/MarketplaceHomeStates (extracted)
  primitives/Section, SectionHeader, GlassCard, SoftButton
  skeleton/SkeletonSystem
```

**Import rule:** Adapter and module paths only — no full design-system barrel from OrderBhojan (avoids Founder app typecheck leaks).

---

## Files changed

### New — OrderBhojan presentation

- `orderbhojan/src/presentation/discovery/OrderBhojanHomeHero.tsx`
- `orderbhojan/src/presentation/discovery/OrderBhojanHomeLocationBar.tsx`
- `orderbhojan/src/presentation/discovery/OrderBhojanHomeCategories.tsx`
- `orderbhojan/src/presentation/discovery/OrderBhojanHomeTrustStrip.tsx`
- `orderbhojan/src/presentation/discovery/OrderBhojanHomeFeedSkeleton.tsx`
- `orderbhojan/src/presentation/discovery/OrderBhojanDiscoveryStatePanel.tsx`
- `orderbhojan/src/presentation/discovery/index.ts`

### New — Founder design-system

- `src/design-system/adapters/marketplace/MarketplaceDiscoveryHeroView.tsx`
- `src/design-system/marketplace/MarketplaceHomeStates.tsx` (extracted from `src/components`)

### Modified

- `orderbhojan/src/features/experience/ui/home/HomeExperiencePage.tsx` — Founder `Section` layout
- `orderbhojan/src/features/discovery/ui/DiscoveryHomeFeed.tsx` — DS skeletons + state panels (logic unchanged)
- `orderbhojan/src/features/experience/ui/home/HomeSpotlightMockFeed.tsx` — DS skeletons
- `orderbhojan/src/styles/globals.css` — Founder DS tokens + `@source`
- `src/components/marketplace/MarketplaceHomeStates.tsx` — compatibility re-export
- `src/design-system/marketplace/index.ts` — export `MarketplaceHomeStates`
- `src/design-system/adapters/marketplace/index.ts` — export hero adapter

### Intentionally retained (Phase 7 deletion)

- `KitchenDoorHero.tsx` — no longer mounted; kept for rollback
- `HomeLocationBar.tsx` — superseded by hero location slot
- BDS `MotionPage`, `PremiumChip`, `Rail`, `TrustStrip` imports elsewhere
- `experience-home-v2.css`, `experience-discovery.css`

---

## Business logic verification

| System | Changed? |
|--------|----------|
| `useDiscoveryHome` / React Query | ❌ No |
| `useDiscoveryFilterStore` | ❌ No |
| `useCategoryStore` | ❌ No |
| Hero scene rotation / preload hooks | ❌ No |
| Routing (`/search` on search focus) | ❌ No |
| `DiscoveryCollectionRail` data | ❌ No |
| Firestore / API clients | ❌ No |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` (orderbhojan) | ✅ PASS |
| `tsc --noEmit` (via build) | ✅ PASS |
| `npm run lint` (orderbhojan) | ⚠️ 4 pre-existing errors in `location/` UI (not introduced by 2A) |
| `validate-architecture.mjs` | ✅ PASS |
| `npm run build:web` (Founder) | ✅ PASS |
| `tests/m15-experience.test.ts` | ✅ 16/16 |
| `tests/m3-discovery.test.ts` | ✅ 21/21 |

---

## Visual regression report

| Element | Before (BDS / Evening Kitchen) | After (Founder DS) | Match |
|---------|-------------------------------|---------------------|-------|
| Page background | `ob-home-page` + BDS luxury gradient | `#030303` + Founder `Section` | ✅ |
| Hero | `KitchenDoorHero` + `PremiumSearch` | `MarketplaceDiscoveryHeroView` + `MarketplaceSearchBar` | ✅ |
| Hero imagery | Rotating food scenes | Same scenes, Founder scrim/typography | ✅ |
| Location | `HomeLocationBar` | Inline chip in hero (Founder pill) | ✅ |
| Categories | BDS `PremiumChip` + `Rail` | Founder image chips, orange selection | ✅ |
| Trust | BDS `TrustStrip` icons | `GlassCard` trust row | ✅ |
| Loading | BDS `RestaurantRailSkeleton` | `HomeBentoSkeleton`, `RecommendedSkeleton`, `TrendingSkeleton` | ✅ |
| Empty / error | BDS `Text` + `Button` | `SectionHeader` + `SoftButton` | ✅ |

**Manual QA recommended:** Hero slide rotation, search tap → `/search`, category filter → mock feed, discovery ON/OFF flag, safe-area on iOS.

---

## Performance report

| Metric | Shell baseline | After 2A | Delta |
|--------|----------------|----------|-------|
| CSS bundle | 241.05 kB | 251.14 kB | +10.1 kB (Founder tokens + soft-btn + shimmer) |
| JS main chunk | 1,425.05 kB | 1,470.64 kB | +45.6 kB (Section, skeletons, hero adapter) |
| Precache total | 1,982 KiB | 2,036 KiB | +54 KiB |

**Assessment:** Acceptable for Phase 6. Tree-shaking via adapter paths. Further splitting deferred to Phase 7.

---

## Remaining duplicates

| Component | Location | Removal |
|-----------|----------|---------|
| `KitchenDoorHero` | `features/experience/ui/home/` | Phase 7 (after full Discovery migration) |
| `HomeLocationBar` | same | Phase 7 |
| `HeroHeader`, `CategoryRail` | experience/home | Phase 7 |
| `DiscoveryRestaurantCard` | discovery/ui | Milestone 2B |
| BDS discovery primitives | `@bhojan/design-system` | Phase 7 |

---

## Rollback plan

1. Revert `HomeExperiencePage.tsx` to import `KitchenDoorHero`, `HomeLocationBar`, BDS `MotionPage` / `PremiumChip` / `Rail` / `TrustStrip`.
2. Revert `DiscoveryHomeFeed.tsx` and `HomeSpotlightMockFeed.tsx` skeleton imports.
3. Remove `orderbhojan/src/presentation/discovery/` directory.
4. Revert `globals.css` DS style import if not needed by Shell.
5. Run `npm run build` — legacy components remain in tree.

**Rollback time:** &lt; 20 minutes. No API or data changes.

---

## Stop condition

**Milestone 2A complete.** Per Chief Architect execution model:

**STOP — awaiting approval before Milestone 2B (Restaurant Listing).**

Do not migrate restaurant cards until approved.
