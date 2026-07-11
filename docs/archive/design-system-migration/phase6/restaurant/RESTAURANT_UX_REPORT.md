# Phase 6 — Milestone 3D: Restaurant UX Report

**Agent:** 3 — Restaurant Experience + Menu Migration  
**Date:** 2026-07-10  
**Status:** ✅ COMPLETE — Agent 3 closed

---

## Executive summary

Restaurant and menu UX states are standardized on Founder `src/design-system`. Loading skeletons, error/retry, offline, empty menu, and closed-restaurant banners use `MarketplaceUxStateView`, `RestaurantHeroSkeleton`, and `RestaurantMenuPageSkeleton`. Business logic (React Query, engines, hooks) unchanged.

---

## Architecture

```
useRestaurantExperience / useFoodMenu (unchanged)
        ↓
OrderBhojanRestaurantExperience | OrderBhojanFoodExperience
        ↓
presentation/states/restaurant/*
        ↓
MarketplaceUxStateView | SkeletonSystem | GlassCard
```

---

## New modules

| Module | Purpose |
|--------|---------|
| `marketplace/MarketplaceUxStateView.tsx` | Generic empty/error/offline/loading |
| `skeleton/RestaurantHeroSkeleton` | Restaurant page loading |
| `skeleton/RestaurantMenuPageSkeleton` | Menu page loading |
| `presentation/states/restaurant/index.tsx` | Restaurant + menu state presets |

---

## States wired

| Surface | Loading | Error | Offline | Empty | Closed |
|---------|---------|-------|---------|-------|--------|
| Restaurant | `RestaurantHeroSkeleton` | `OrderBhojanRestaurantErrorState` | Banner + error | N/A | `OrderBhojanRestaurantClosedBanner` |
| Menu | `RestaurantMenuPageSkeleton` | `OrderBhojanMenuErrorState` | Banner + error | `OrderBhojanMenuEmptyState` | Via item `unavailable` |
| Customization | N/A (3C) | Parent menu | Parent menu | N/A | N/A |

---

## Refactors

- `OrderBhojanDiscoveryUxState` now delegates to `MarketplaceUxStateView` (discovery unchanged API).
- `OrderBhojanRestaurantSkeleton` / `OrderBhojanFoodMenuSkeleton` use DS composite skeletons.

---

## Validation

| Check | Result |
|-------|--------|
| `npm run build` | ✅ PASS |
| `validate-architecture.mjs` | ✅ PASS |
| `validate-design-system.mjs` | ✅ PASS |
| `tests/m5-restaurant.test.ts` | ✅ PASS |
| `tests/m6-food.test.ts` | ✅ PASS |

---

## STOP

**Agent 3 complete.** Do not begin Checkout, Orders, Tracking, or Profile.
