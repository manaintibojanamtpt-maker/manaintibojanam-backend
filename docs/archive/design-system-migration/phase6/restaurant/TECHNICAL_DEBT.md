# Technical Debt — Phase 6 Restaurant Migration

**Last updated:** 2026-07-10  
**Owner:** Agent 3 — Restaurant Experience + Menu Migration

---

## Pre-existing (unchanged from Discovery)

| Issue | Notes |
|-------|-------|
| Location UI lint (4 errors) | Non-blocking |
| Dual BDS + Founder CSS | Phase 7 cleanup |

---

## New issues (3A)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| TD-7-01 | `MobileRestaurantHeader` not in `src/design-system/` — composed in presentation | Low | Accepted — pattern match via primitives |
| TD-7-02 | `experience-restaurant.css` loaded but hot-path rules orphaned | Low | Phase 7 |
| TD-7-03 | Shim files: `RestaurantExperiencePage`, `RestaurantGlassActions`, `RestaurantGalleryRail` | Low | Rollback until Phase 7 |
| TD-7-04 | `ProfileImage` uses framer-motion-adjacent glow animation | Low | Verify reduced motion in 3D |
| TD-7-05 | About description shown in hero card AND about section when present | Low | Accept — matches Founder density |

---

## Remaining BDS in restaurant hot path

None — restaurant page uses Founder DS only.

## New issues (3B)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| TD-7-06 | `experience-food.css` loaded but hot-path rules orphaned | Low | Phase 7 |
| TD-7-07 | Food shim files (6 re-exports) | Low | Rollback until Phase 7 |
| TD-7-08 | Stepper uses brand hex `#2A1A12`, `#F4C27A` in presentation | Low | Token migration Phase 7 |
| TD-7-09 | `MenuItemCard` (cart-coupled) vs `MenuItemCardView` dual export in DS | Low | Documented split |
| TD-7-10 | BDS `FoodRow` / `StickyCategoryRail` removed from hot path only | Low | Phase 7 package cleanup |

## New issues (3C)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| TD-7-11 | `FoodCustomizeSheet` / `FoodStoryPanel` shims (2 files) | Low | Rollback until Phase 7 |
| TD-7-12 | Sheet panel uses `#0d0d0d` literal (migration allowlist) | Low | Token migration Phase 7 |
| TD-7-13 | BDS `BottomSheet` removed from food hot path only | Low | Phase 7 package cleanup |

## New issues (3D)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| TD-7-14 | `MarketplaceUxStateView` shared with discovery — single DS primitive | Low | Accepted |
| TD-7-15 | Menu empty uses full-page state (no partial menu shell) | Low | Accept |
| TD-7-16 | `ExperienceSkeletons.tsx` remains for home — not deleted | Low | Phase 7 |

## Agent 3 status

**COMPLETE** — all restaurant hot-path presentation in Founder DS.

## Remaining (out of Agent 3 scope)

- Checkout, orders, tracking, profile — BDS `PremiumEmpty` remains
