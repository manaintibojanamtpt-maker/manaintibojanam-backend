# Phase 6 — Milestone 3B: Menu Performance Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10

## Bundle comparison

| Metric | After 3A (Restaurant Shell) | After 3B (Menu) | Delta 3B |
|--------|----------------------------|-----------------|----------|
| CSS (gzip) | 39.93 kB (257.17 kB raw) | 40.17 kB (258.98 kB raw) | +0.24 kB gzip |
| JS main chunk (gzip) | 409.10 kB (1,487.50 kB raw) | 409.38 kB (1,488.39 kB raw) | +0.28 kB gzip |
| Food route chunk | — | 24.82 kB raw / 7.95 kB gzip | Lazy route |
| Precache total | 2,059 KiB | 2,065 KiB | +6 KiB |

## Assessment

| Criterion | Result |
|-----------|--------|
| Unnecessary bundle increase | ✅ No — main JS +0.07% |
| Tree-shaking maintained | ✅ Adapter subpath imports only |
| BDS `FoodRow` in hot path | ✅ Removed |
| BDS `StickyCategoryRail` in hot path | ✅ Removed |
| BDS `DishPoster` in hot path | ✅ Removed |
| BDS `FloatingCart` in hot path | ✅ Removed |
| Hero preload preserved | ✅ `useHeroPreload` unchanged |
| Lazy image loading preserved | ✅ Default lazy + priority for first items |
| Menu route code-split | ✅ `FoodRoutePage` separate chunk |

## New modules

- `OrderBhojanFoodExperience` + 8 sibling presentation modules
- `MenuItemCardView` + `FeaturedMenuItemCardView` in `src/design-system/food/`

## Removed from hot path

- BDS `FoodRow`, `FoodRowAddButton`, `StickyCategoryRail`, `DishPoster`, `FloatingCart`
- `ob-menu-px2`, `ob-food-px6` layout classes on menu page

## Memory & render

- No new global stores
- Category sections render synchronously (virtualization not required at current menu sizes)
- Fly animation on add uses short-lived local state (520ms timeout)

**Verdict:** Performance regression negligible. Production-safe.
