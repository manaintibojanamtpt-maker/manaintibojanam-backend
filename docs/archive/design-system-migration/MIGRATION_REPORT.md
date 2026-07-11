# Phase 3 — Component Extraction Migration Report

**Agent:** Component Extraction Agent (Agent 3)  
**Phase:** 3  
**Status:** ✅ COMPLETE — awaiting Chief Architect approval before Phase 4  
**Date:** 2026-07-10  

---

## Validation checklist

- [x] `src/design-system/` created with tokens, primitives, layout, cart, food, marketplace, orders, location
- [x] All P0 components **copied** (originals replaced with compatibility re-exports only)
- [x] TypeScript types preserved
- [x] Props interfaces preserved
- [x] Tailwind classes unchanged (verbatim copy)
- [x] Framer Motion usage unchanged
- [x] Context/hook imports preserved (point to `src/context`, `src/hooks`, `src/lib`)
- [x] No OrderBhojan changes
- [x] No BDS deletion
- [x] No Experience CSS deletion
- [x] `npm run build:web` — **PASS**
- [x] `npm run lint` — no new errors in `src/design-system/` (pre-existing backend-lib errors remain)
- [x] Founder Store routes compile through compatibility re-exports

---

## Summary

| Metric | Value |
|--------|------:|
| Components copied | 36 |
| Token/CSS files created | 7 |
| Index/barrel files | 9 |
| Compatibility re-exports | 36 |
| Total `src/design-system/` files | 52 |
| Lines in largest extract (`OrderTracking.tsx`) | 1,091 |

---

## Extraction order completed

| # | Domain | Source | Destination |
|---|--------|--------|-------------|
| 1 | Tokens | `src/index.css` @theme + utilities | `src/design-system/tokens/`, `styles/` |
| 2 | UI primitives | `src/components/ui/*` (14 files) | `src/design-system/primitives/` |
| 3 | Buttons | `SoftButton`, `CTAButton` | `primitives/` |
| 4 | Glass | `GlassCard` | `primitives/` |
| 5 | Skeleton | `SkeletonSystem` | `skeleton/` |
| 6 | BottomNav | `src/components/BottomNav.tsx` | `layout/` |
| 7 | Header | `src/components/Header.tsx` | `layout/` |
| 8 | StorefrontDesktopHeader | `src/components/StorefrontDesktopHeader.tsx` | `layout/` |
| 9 | FloatingMiniCart | `src/components/FloatingMiniCart.tsx` | `cart/` |
| 10 | DesktopFloatingCart | `src/components/DesktopFloatingCart.tsx` | `cart/` |
| 11 | MenuItemCard | `src/components/MenuItemCard.tsx` | `food/` |
| 12 | Banner | `src/components/Banner.tsx` | `food/` |
| 13 | Marketplace search | 9 marketplace components | `marketplace/` |
| 14 | MarketplaceKitchenCard | `marketplace/MarketplaceKitchenCard.tsx` | `marketplace/` |
| 15 | OrderTracking | `src/components/OrderTracking.tsx` | `orders/` |
| 16 | DigitalInvoice | `src/components/DigitalInvoice.tsx` | `orders/` |
| 17 | AutoLocationForm | `src/components/AutoLocationForm.tsx` | `location/` |
| 18 | HeaderLocationDropdown | `src/components/HeaderLocationDropdown.tsx` | `location/` |

---

## Compatibility re-export pattern

Every original path remains valid. Example:

```typescript
// src/components/BottomNav.tsx (stub)
/** @deprecated Import from '@/design-system' — compatibility re-export (Phase 3) */
export { default } from '../design-system/layout/BottomNav';
```

Pages importing `../components/BottomNav` resolve to the same component implementation in `src/design-system/`.

---

## Dependencies intentionally left in `src/components/`

These are imported by extracted components but **not** moved in Phase 3:

| Component | Used by |
|-----------|---------|
| `ActiveOrderStrip` | BottomNav |
| `StorefrontInstallButton` | Header, StorefrontDesktopHeader |
| `BottomSheet` | MenuItemCard |

---

## Barrel export

Public API entry: `src/design-system/index.ts`

```typescript
import { MenuItemCard, BottomNav, MarketplaceSearchBar } from '@/design-system';
// or direct path:
import MenuItemCard from '@/design-system/food/MenuItemCard';
```

**Note:** `Skeleton` name collision resolved in barrel — `SkeletonSystem`'s shimmer skeleton exported as `ShimmerSkeleton`; pages still import `Skeleton` via `src/components/SkeletonSystem` re-export.

---

## Build verification

```
npm run build:web  → ✓ built in ~67s (4001 modules)
```

Design-system modules appear in build graph:
- `src/design-system/orders/OrderTracking.tsx`
- `src/design-system/location/AutoLocationForm.tsx`
- `src/design-system/location/HeaderLocationDropdown.tsx`

---

## Visual regression status

Phase 3 uses **identical source copies** with path-only changes. No JSX, className, or animation logic was modified.

Formal pixel comparison (Agent 5) is scheduled before OrderBhojan migration. Phase 3 gate: **build equivalence + re-export chain integrity**.

---

## Change log

| Timestamp | Action |
|-----------|--------|
| 2026-07-10 | Created `src/design-system/` hierarchy |
| 2026-07-10 | Copied 36 presentation components |
| 2026-07-10 | Created token CSS copies from `index.css` |
| 2026-07-10 | Replaced 36 original files with compatibility re-exports |
| 2026-07-10 | Fixed re-export relative paths (`fix-reexport-paths.mjs`) |
| 2026-07-10 | Fixed `OrderTracking` mixed-quote imports |
| 2026-07-10 | Resolved `Skeleton` barrel export collision |
| 2026-07-10 | `npm run build:web` PASS |

---

## Rollback strategy

1. Restore original component files from git: `git checkout HEAD -- src/components/`
2. Delete `src/design-system/` directory
3. Remove `scripts/design-system/extract-phase3.mjs` artifacts if desired

Tag recommended: `ds-migration-phase-3`

---

## Gate decision

**Phase 3: PASS** — shared design system exists; Founder Store compiles through compatibility layer.

**STOP** — Await Chief Architect approval before Phase 4 (Token Agent).

**Next phase:** Extract remaining hardcoded values into `src/design-system/tokens/` and wire `index.css` to import design-system styles (Phase 4).
