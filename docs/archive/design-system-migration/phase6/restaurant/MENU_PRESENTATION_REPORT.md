# Phase 6 — Milestone 3B: Menu Presentation Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ COMPLETE — validation gate passed

---

## Executive summary

The restaurant menu page (`/restaurant/:restaurantSlug/menu`) now renders entirely through Founder `src/design-system` presentation adapters in `orderbhojan/src/presentation/food/`. Category navigation, food cards, signature dishes, floating cart, skeletons, and error states use `MenuItemCardView`, `FeaturedMenuItemCardView`, `Section`, `SectionHeader`, `GlassCard`, `SoftButton`, and `SkeletonSystem`. All menu business logic remains in features (hooks, engines, cart store).

---

## Architecture

```
useFoodMenu + useCategoryScrollSpy (unchanged)
        ↓
OrderBhojanFoodExperience
        ↓
OrderBhojanFoodRestaurantStrip | CategoryRail | FeaturedCard | MenuSection | FloatingCart
        ↓
MenuItemCardView | FeaturedMenuItemCardView | GlassCard | SoftButton | Section
```

---

## New design-system modules

| File | Purpose |
|------|---------|
| `src/design-system/food/MenuItemCardView.tsx` | Presentational food row (no cart coupling) |
| `src/design-system/food/FeaturedMenuItemCardView.tsx` | Horizontal signature dish card |
| `src/design-system/food/types.ts` | `MenuItemCardViewModel`, badge types |

---

## Presentation adapters

| File | Role |
|------|------|
| `OrderBhojanFoodExperience.tsx` | Page shell, query wiring, signature merge |
| `OrderBhojanFoodCardItem.tsx` | Cart add/stepper + `MenuItemCardView` |
| `OrderBhojanFoodFeaturedCard.tsx` | Featured cards + preview store |
| `OrderBhojanFoodCategoryRail.tsx` | Sticky category chips + scroll spy target |
| `OrderBhojanFoodRestaurantStrip.tsx` | Menu header with logo + nav |
| `OrderBhojanFoodFloatingCart.tsx` | Fixed cart CTA bar |
| `OrderBhojanFoodMenuSection.tsx` | Category section wrapper |
| `OrderBhojanFoodMenuSkeleton.tsx` | Loading skeleton |
| `mapFoodToMenuItemCardView.ts` | `FoodPublic` → view model mapper |

---

## Shim policy (rollback)

Legacy feature UI files re-export presentation adapters:

- `FoodExperiencePage.tsx`
- `FoodCardItem.tsx`
- `FoodCategoryRail.tsx`
- `FoodFeaturedPoster.tsx`
- `FoodRestaurantStrip.tsx`
- `FoodFloatingPreview.tsx`

---

## Unchanged (verified)

| Layer | Files |
|-------|-------|
| React Query | `useFoodMenu` |
| Engine | `foodExperienceLayer.ts` |
| Scroll spy | `useCategoryScrollSpy` |
| Cart | `useCartStore` |
| Customize | `FoodCustomizeSheet` (3C deferred) |
| Routing | `FoodRoutePage`, `AppRouter` |
| Hero preload | `useHeroPreload` |
| Tenant sync | `useTenantRevisionSync` |

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` | ✅ PASS |
| `validate-architecture.mjs` | ✅ PASS |
| `validate-design-system.mjs` | ✅ PASS |
| `tests/m6-food.test.ts` | ✅ PASS |
| `tests/m65-premium-evolution.test.ts` | ✅ PASS |
| `tests/px2-design-implementation.test.ts` | ✅ PASS |

---

## STOP condition

**Milestone 3B complete. Do not begin 3C Customization.**

Await Chief Architect approval.
