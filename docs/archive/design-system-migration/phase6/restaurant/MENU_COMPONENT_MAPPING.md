# Menu Component Mapping — Phase 6 / Milestone 3B

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ Mapping complete — Milestone 3B implementation complete

---

## Menu page (`/restaurant/:restaurantSlug/menu`)

| Current OB Component | File | Founder DS Replacement | Presentation Wire | Migration Status |
| -------------------- | ---- | ---------------------- | ----------------- | ---------------- |
| Page shell | `FoodExperiencePage.tsx` | `Section` layout on `#030303` | `OrderBhojanFoodExperience` | ✅ Complete |
| Loading skeleton | Inline `FoodExperienceSkeleton` | `MenuItemSkeleton` + `CategorySkeleton` | `OrderBhojanFoodMenuSkeleton` | ✅ Complete |
| Error / retry | Inline BDS `Button` | `OrderBhojanDiscoveryUxState` | Reuse `presentation/states` | ✅ Complete |
| Restaurant header strip | `FoodRestaurantStrip.tsx` | `GlassCard` + `ProfileImage` | `OrderBhojanFoodRestaurantStrip` | ✅ Complete |
| Category rail | `FoodCategoryRail.tsx` | Founder sticky chips | `OrderBhojanFoodCategoryRail` | ✅ Complete |
| Food list row | `FoodCardItem.tsx` | `MenuItemCardView` | `OrderBhojanFoodCardItem` | ✅ Complete |
| Signature poster | `FoodFeaturedPoster.tsx` | `FeaturedMenuItemCardView` | `OrderBhojanFoodFeaturedCard` | ✅ Complete |
| Category sections | Inline in `FoodExperiencePage` | `Section` + `SectionHeader` | `OrderBhojanFoodMenuSection` | ✅ Complete |
| Floating cart bar | `FoodFloatingPreview.tsx` | `GlassCard` + `SoftButton` | `OrderBhojanFoodFloatingCart` | ✅ Complete |
| Customize sheet host | `FoodCustomizeSheet.tsx` | BDS `BottomSheet` | **Unchanged in 3B** (3C) | Deferred |

---

## Data mapping (presentation only)

| Mapper | Input | Output |
| ------ | ----- | ------ |
| `mapFoodToMenuItemCardView.ts` | `FoodPublic` + formatters | `MenuItemCardViewModel` |
| `mapFoodToFeaturedCardView` | `FoodPublic` + formatters | `MenuItemCardViewModel` (featured sizes) |

---

## Route / provider (unchanged logic)

| Component | File | Action |
| --------- | ---- | ------ |
| `FoodRoutePage` | `FoodRoutePage.tsx` | **No change** — feature flag gate |
| `FoodProvider` | `FoodProvider.tsx` | **Unchanged** |
| `useFoodMenu` | `hooks/useFoodMenu.ts` | **Unchanged** |
| `useCategoryScrollSpy` | `hooks/useCategoryScrollSpy.ts` | **Unchanged** |
| `foodExperienceLayer` | `engine/foodExperienceLayer.ts` | **Unchanged** |
| `useCartStore` | `cart/store/cartStore.ts` | **Unchanged** (wired in presentation) |
| `FoodCustomizeSheet` | `FoodCustomizeSheet.tsx` | **Unchanged** until 3C |

---

## CSS / BDS (retain until Phase 7)

| Asset | Action |
| ----- | ------ |
| `experience-food.css` | Keep loaded; hot-path rules orphaned at runtime |
| `ob-menu-px2`, `ob-food-px6` classes | Replaced by Founder layout in presentation |
| BDS `FoodRow`, `DishPoster`, `StickyCategoryRail`, `FloatingCart` | Removed from hot path; files retained |

---

## Founder DS components used (3B)

| DS Component | Usage |
| ------------ | ----- |
| `MenuItemCardView` | Food list rows |
| `FeaturedMenuItemCardView` | Signature / recommended horizontal cards |
| `Section` / `SectionHeader` | Category sections |
| `GlassCard` | Header strip, floating cart |
| `SoftButton` | Add, stepper, cart CTA, nav |
| `ProfileImage` | Restaurant logo in menu header |
| `SkeletonSystem` | Loading states |
| `OrderBhojanDiscoveryUxState` | Error state |

---

## Checkpoint

**Milestone 3B complete.** STOP — await Chief Architect approval before 3C.
