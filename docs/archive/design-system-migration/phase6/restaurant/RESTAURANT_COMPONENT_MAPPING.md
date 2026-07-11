# Restaurant Component Mapping — Phase 6 / Milestone 3A

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ Mapping complete — Milestone 3A implementation complete

---

## Restaurant shell (`/restaurant/:restaurantSlug`)

| Current OB Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| -------------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Page shell | `RestaurantExperiencePage.tsx` | `Section` layout on `#030303` | `OrderBhojanRestaurantExperience` | ✅ Complete |
| Loading skeleton | `RestaurantExperiencePage.tsx` | `SkeletonSystem` | `OrderBhojanRestaurantSkeleton` | ✅ Complete |
| Error / retry | `RestaurantExperiencePage.tsx` | `OrderBhojanDiscoveryUxState` | Reuse `presentation/states` | ✅ Complete |
| Immersive hero | BDS `RestaurantHero` | `GlassCard` + cover + `ProfileImage` | `OrderBhojanRestaurantHero` | ✅ Complete |
| Sticky title bar | `RestaurantStickyHeader` | Compact header strip | `OrderBhojanRestaurantStickyHeader` | ✅ Complete |
| Chrome actions | `RestaurantGlassActions` | `GlassCard` + icon buttons | `OrderBhojanRestaurantActions` | ✅ Complete |
| Meta badges | `RestaurantMetaRow` | Founder pill stats | `OrderBhojanRestaurantMeta` | ✅ Complete |
| Offer / status badges | Inline in hero | Founder orange pills | Inline in `OrderBhojanRestaurantHero` | ✅ Complete |
| Gallery rail | `RestaurantGalleryRail` | Horizontal scroll + lazy images | `OrderBhojanRestaurantGallery` | ✅ Complete |
| About section | Inline | `Section` + `SectionHeader` | `OrderBhojanRestaurantInfoSections` | ✅ Complete |
| Subscription block | Inline `GlassSurface` | `GlassCard` + `SoftButton` | `OrderBhojanRestaurantInfoSections` | ✅ Complete |
| Highlights grid | Inline `GlassSurface` | `GlassCard` grid | `OrderBhojanRestaurantInfoSections` | ✅ Complete |
| Hours list | Inline `Text` | `Section` + rows | `OrderBhojanRestaurantInfoSections` | ✅ Complete |
| Policies footer | Inline | `Section` + captions | `OrderBhojanRestaurantInfoSections` | ✅ Complete |
| Menu CTA | BDS `FloatingCTA` | Fixed `SoftButton` primary | `OrderBhojanRestaurantExperience` | ✅ Complete |

---

## Visual reference (Founder Store)

| Founder reference | Usage in 3A |
| ----------------- | ------------- |
| `MobileRestaurantHeader` (`src/components/`) | Identity card layout, trust pills, delivery grid |
| `GlassCard` | Hero identity card, highlights, subscription |
| `ProfileImage` | Kitchen logo |
| `Section` / `SectionHeader` | About, gallery, hours headings |
| `SoftButton` | Subscription CTA, menu CTA, action chrome |

**Note:** `MobileRestaurantHeader` is not yet in `src/design-system/` — 3A composes equivalent layout from DS primitives in the presentation adapter.

---

## Route / provider (unchanged logic)

| Component | File | Action |
| --------- | ---- | ------ |
| `RestaurantRoutePage` | `RestaurantRoutePage.tsx` | **No change** — feature flag gate |
| `RestaurantProvider` | `RestaurantProvider.tsx` | **Unchanged** |
| `useRestaurantExperience` | `hooks/useRestaurantExperience.ts` | **Unchanged** |
| `restaurantExperienceLayer` | `engine/restaurantExperienceLayer.ts` | **Unchanged** |
| `restaurantApiClient` | `infrastructure/` | **Unchanged** |
| `useRestaurantScrollChrome` | `hooks/useRestaurantScrollChrome.ts` | **Unchanged** (wired from presentation) |
| `useFavoritesStore` | experience store | **Unchanged** (wired in actions) |
| `restaurant-photo-manifest` | `data/` | **Unchanged** |

---

## CSS / BDS (retain until Phase 7)

| Asset | Action |
| ----- | ------ |
| `experience-restaurant.css` | Keep loaded; rules become orphaned at runtime |
| BDS `RestaurantHero`, `FloatingCTA`, `GlassSurface`, `MotionPage` | Removed from hot path; files retained |
| `ob-restaurant-px5*` classes | Replaced by Tailwind + DS layout in presentation |

---

## Founder DS components used (3A)

| DS Component | Usage |
| ------------ | ----- |
| `GlassCard` | Identity card, highlights, subscription, action bar |
| `Section` / `SectionHeader` | Info sections |
| `SoftButton` | Menu CTA, subscription link, actions |
| `ProfileImage` | Kitchen logo |
| `SkeletonSystem` | Page loading skeleton |
| `OrderBhojanDiscoveryUxState` | Error / retry (from Agent 2) |

---

## Deferred to later milestones

| Component | Milestone |
| --------- | --------- |
| `FoodExperiencePage` / menu layout | 3B Menu |
| `FoodCardItem` / `FoodRow` → `MenuItemCard` | 3B Menu |
| `FoodCategoryRail` | 3B Menu |
| `FoodCustomizeSheet` | 3C Customization |
| Restaurant/menu skeletons polish | 3D Restaurant UX |

See [MENU_COMPONENT_MAPPING.md](./MENU_COMPONENT_MAPPING.md).

---

## Behaviour preservation matrix

| Behaviour | Preserved via |
| --------- | ------------- |
| React Query load / refetch | `useRestaurantExperience` (unchanged) |
| Tenant revision sync | `useTenantRevisionSync` (unchanged) |
| Scroll collapse hero | `useRestaurantScrollChrome` (unchanged) |
| Cover preload | `useHeroPreload` (unchanged) |
| Poster enter animation | `enterFromPoster` location state (unchanged) |
| Favorite toggle | `useFavoritesStore` (unchanged) |
| Share / back navigation | Same callbacks in actions |
| Menu CTA gate | `useFoodFeatureEnabled` + open status (unchanged) |
| Gallery lazy load | `useLazyInView` (unchanged) |

---

## Implementation order

1. `presentation/restaurant/OrderBhojanRestaurantSkeleton.tsx`
2. `presentation/restaurant/OrderBhojanRestaurantActions.tsx`
3. `presentation/restaurant/OrderBhojanRestaurantStickyHeader.tsx`
4. `presentation/restaurant/OrderBhojanRestaurantMeta.tsx`
5. `presentation/restaurant/OrderBhojanRestaurantHero.tsx`
6. `presentation/restaurant/OrderBhojanRestaurantGallery.tsx`
7. `presentation/restaurant/OrderBhojanRestaurantInfoSections.tsx`
8. `presentation/restaurant/OrderBhojanRestaurantExperience.tsx`
9. Shim: `RestaurantExperiencePage.tsx` → re-export
10. Shims: `RestaurantGlassActions.tsx`, `RestaurantGalleryRail.tsx`
11. Update px2 / m65 / m6 tests

---

## Checkpoint

**Mapping complete. Milestone 3A complete.**

**STOP — do not begin 3B Menu until Chief Architect approval.**
