# Phase 6 — Milestone 3A: Rollback Plan

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10

## When to rollback

- Visual regression on restaurant hero blocks release
- Favorite / share / navigation regression
- Menu CTA fails to navigate to `/menu`

## Steps (< 25 minutes)

1. **Restore restaurant UI** from git:
   - `orderbhojan/src/features/restaurant/ui/RestaurantExperiencePage.tsx`
   - `orderbhojan/src/features/restaurant/ui/RestaurantGlassActions.tsx`
   - `orderbhojan/src/features/restaurant/ui/RestaurantGalleryRail.tsx`

2. **Remove presentation layer**:
   - `orderbhojan/src/presentation/restaurant/` (entire directory)

3. **Revert tests**:
   - `tests/px2-design-implementation.test.ts`
   - `tests/m5-restaurant.test.ts`
   - `tests/m6-food.test.ts`
   - `tests/m65-premium-evolution.test.ts`

4. **Verify**
   ```bash
   cd orderbhojan && npm run build
   node --import tsx --test tests/m5-restaurant.test.ts
   ```

## Partial rollback

Keep Discovery (Agent 2) and shell (Agent 1) — restore only restaurant files above.

## What rollback does NOT affect

- Restaurant shell (3A presentation layer) — independent
- Restaurant engine, hooks, API client
- Cart / checkout / discovery

---

# Milestone 3B — Menu Rollback

**Date:** 2026-07-10

## When to rollback

- Visual regression on menu cards blocks release
- Category scroll spy / add-to-cart regression
- Floating cart fails to navigate to checkout

## Steps (< 30 minutes)

1. **Restore food UI** from git:
   - `orderbhojan/src/features/food/ui/FoodExperiencePage.tsx` (full BDS implementation)
   - `FoodCardItem.tsx`, `FoodCategoryRail.tsx`, `FoodFeaturedPoster.tsx`
   - `FoodRestaurantStrip.tsx`, `FoodFloatingPreview.tsx`

2. **Remove presentation layer**:
   - `orderbhojan/src/presentation/food/` (entire directory)

3. **Optional — revert DS extracts** (if menu cards break Founder Store):
   - `src/design-system/food/MenuItemCardView.tsx`
   - `src/design-system/food/FeaturedMenuItemCardView.tsx`

4. **Revert tests**:
   - `tests/px2-design-implementation.test.ts`
   - `tests/m6-food.test.ts`
   - `tests/m65-premium-evolution.test.ts`

5. **Verify**
   ```bash
   cd orderbhojan && npm run build
   node --import tsx --test tests/m6-food.test.ts tests/px2-design-implementation.test.ts
   node ../scripts/validate-design-system.mjs
   ```

## Partial rollback

Keep restaurant shell (3A) and discovery — restore only food files above.

---

# Milestone 3C — Customization Rollback

**Date:** 2026-07-10

## When to rollback

- Customize sheet fails to add items to cart
- Variant / add-on price calculation regression
- Sheet fails to open from menu cards

## Steps (< 20 minutes)

1. **Restore customize UI** from git:
   - `orderbhojan/src/features/food/ui/FoodCustomizeSheet.tsx` (full BDS implementation)
   - `orderbhojan/src/features/food/ui/FoodStoryPanel.tsx`

2. **Remove presentation modules**:
   - `OrderBhojanFoodCustomizeSheet.tsx`
   - `OrderBhojanFoodStoryPanel.tsx`
   - `mapFoodToCustomizationStory.ts`

3. **Optional — revert DS extracts**:
   - `src/design-system/food/FoodCustomizationPanelView.tsx`
   - `src/design-system/food/FoodCustomizationStoryView.tsx`
   - `src/design-system/primitives/QuantityStepperView.tsx`

4. **Verify**
   ```bash
   cd orderbhojan && npm run build
   node --import tsx --test tests/m6-food.test.ts
   ```

## Partial rollback

Keep menu + customization (3B–3C) — restore only UX state files above.

---

# Milestone 3D — Restaurant UX Rollback

**Date:** 2026-07-10

## When to rollback

- UX state regression blocks release
- Offline banner causes layout issues
- Menu empty state false positives

## Steps (< 15 minutes)

1. **Restore experience files** from git:
   - `OrderBhojanRestaurantExperience.tsx` (inline DiscoveryUxState)
   - `OrderBhojanFoodExperience.tsx` (inline error only)
   - `OrderBhojanRestaurantSkeleton.tsx` / `OrderBhojanFoodMenuSkeleton.tsx` (inline Skeleton)

2. **Remove**:
   - `presentation/states/restaurant/index.tsx`

3. **Optional — revert DS**:
   - `MarketplaceUxStateView.tsx`
   - `RestaurantHeroSkeleton` / `RestaurantMenuPageSkeleton`

4. **Verify**
   ```bash
   cd orderbhojan && npm run build
   node --import tsx --test tests/m5-restaurant.test.ts tests/m6-food.test.ts
   ```
