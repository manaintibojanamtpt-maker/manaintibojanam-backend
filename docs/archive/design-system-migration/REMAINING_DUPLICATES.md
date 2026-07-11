# Remaining Duplicates — Post Phase 3

**Agent:** Component Extraction Agent (Agent 3)  
**Date:** 2026-07-10  
**Scope:** Intentionally retained per Phase 3 rules (no deletion until later phases)

---

## Rule reminder

Phase 3 **copies** founder UI into `src/design-system/`. Duplicates below are **expected** until Phase 6–8.

---

## 1. Founder vs design-system (compatibility layer)

| Legacy path | Canonical path | Status |
|-------------|----------------|--------|
| `src/components/BottomNav.tsx` | `src/design-system/layout/BottomNav.tsx` | Re-export stub |
| `src/components/ui/SoftButton.tsx` | `src/design-system/primitives/SoftButton.tsx` | Re-export stub |
| … (36 total) | … | All P0 items stubbed |

**Action:** Phase 8 removes stubs after import codemod.

---

## 2. BDS vs founder/design-system

| BDS (`packages/design-system/`) | Design system equivalent | Consumer |
|----------------------------------|--------------------------|----------|
| `NavIsland`, `SideNav`, `MiniNavIsland` | `BottomNav`, `Header` | OrderBhojan (74 files) |
| `FoodCard`, `FoodRow` | `MenuItemCard` | OrderBhojan |
| `RestaurantCard` | `MarketplaceKitchenCard` | OrderBhojan |
| `FloatingCart`, `CartBar` | `FloatingMiniCart`, `DesktopFloatingCart` | OrderBhojan |
| `ImmersiveHero` | `Banner`, `Home` hero | OrderBhojan |
| `Timeline` | `OrderTracking` | OrderBhojan |
| `AddressInput` | `AutoLocationForm` | OrderBhojan |
| `Button` | `SoftButton`, `CTAButton` | OrderBhojan |
| `Skeleton` | `SkeletonSystem` | OrderBhojan |
| `Card`, `GlassSurface` | `GlassCard`, `mib-glass` | OrderBhojan |

**Status:** BDS **not deleted** (Phase 3 rule). Phase 6 swaps OrderBhojan to design-system.

---

## 3. Experience CSS vs design-system tokens

| OrderBhojan CSS | Lines | Design-system target |
|-----------------|------:|-------------------|
| `experience-home-v2.css` | 532 | `tokens/colors.css`, `styles/` |
| `experience-tracking-v3.css` | 301 | `orders/OrderTracking` Tailwind |
| `experience-profile-v3.css` | 205 | Account page (Phase 6) |
| `experience-checkout.css` | 651 | Checkout page (Phase 6) |
| `experience-food.css` | 527 | `MenuItemCard` |
| `experience-shell.css` | 364 | `layout/BottomNav`, `Header` |
| `experience-premium.css` | 705 | `tokens/glass.css` |
| + 6 more files | ~2,181 | Phase 7 deletion |

**Status:** All 13 files **retained**. Phase 7 deletes after OrderBhojan migration.

---

## 4. CSS token duplication (founder)

| Location | Status |
|----------|--------|
| `src/index.css` | **Active** — still powers Founder Store |
| `src/design-system/tokens/*.css` | **Copy** — not yet wired (Phase 4) |
| `src/design-system/styles/soft-buttons.css` | **Copy** — parallel to `src/styles/soft-buttons.css` |

**Action:** Phase 4 merges into single token source; `index.css` imports design-system styles.

---

## 5. Internal founder duplicates (not extracted)

| Component A | Component B | Notes |
|-------------|-------------|-------|
| `ui/Skeleton.tsx` (pulse) | `SkeletonSystem/Skeleton` (shimmer) | Different implementations; both kept |
| `Navbar.tsx` | `Header` + `BottomNav` | Navbar orphaned — delete later |
| `Footer.tsx` | `EnterpriseFooter` | Footer orphaned |
| `MobileRestaurantHeader.tsx` | `Home.tsx` inline hero | Orphaned reference |

---

## 6. Dependency components (founder-only, not yet in DS)

| Component | Duplicate of / related to | Extract phase |
|-----------|---------------------------|---------------|
| `BottomSheet` | BDS `BottomSheet` | Phase 3.1 or 6 |
| `ActiveOrderStrip` | OB tracking strip | Phase 3.1 |
| `StorefrontInstallButton` | — | Phase 3.1 |
| `FlyToCartAnimation` | — | Phase 3.1 |
| `CourierTrackingTimeline` | OB `OrderTimeline` | Phase 6 |

---

## 7. Typography / theme triple-stack (unchanged)

| Token | Founder | BDS | OrderBhojan |
|-------|---------|-----|-------------|
| Primary | `#FF7A00` | `#FF6B35` | `#e8a838` ❌ |
| Background | `#070504` | neutral.950 | `#0a0706` ❌ |
| Body font | Plus Jakarta Sans | Figtree (OB) | Figtree ❌ |
| Display font | Outfit | Fraunces (OB) | Fraunces ❌ |

**Status:** OrderBhojan Evening Kitchen theme still in production (`3f755ed`). Phase 6 rollback required.

---

## Summary counts

| Category | Count | Phase to resolve |
|----------|------:|------------------|
| Compatibility re-export stubs | 36 | Phase 8 |
| BDS components | 50 | Phase 6–7 |
| Experience CSS files | 13 | Phase 7 |
| Orphaned founder components | 3 | Post Phase 8 cleanup |
| Token CSS dual copies | 2 | Phase 4 |

---

## Gate

No duplicate **deletion** occurred in Phase 3. This document tracks what remains for Phases 4–10.
